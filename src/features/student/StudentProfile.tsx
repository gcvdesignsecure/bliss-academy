import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export type BiodataForm = {
  date_of_birth: string;
  gender: string;
  phone_number: string;
  whatsapp_number: string;
  home_address: string;
  state_of_residence: string;
  country: string;
  bio: string;
  guardian_name: string;
  guardian_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

export type BiodataRow = BiodataForm & {
  profile_photo_url: string | null;
};

export const BIODATA_COLUMNS =
  "date_of_birth,gender,phone_number,whatsapp_number,home_address," +
  "state_of_residence,country,bio,guardian_name,guardian_phone," +
  "emergency_contact_name,emergency_contact_phone,profile_photo_url";

const EMPTY_FORM: BiodataForm = {
  date_of_birth: "",
  gender: "",
  phone_number: "",
  whatsapp_number: "",
  home_address: "",
  state_of_residence: "",
  country: "Nigeria",
  bio: "",
  guardian_name: "",
  guardian_phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

const PHOTO_BUCKET = "student-profile-photos";

function calculateAge(dob: string): number | null {
  if (!dob) return null;

  const birth = new Date(`${dob}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(birth.getTime()) || birth > today) return null;

  let age = today.getFullYear() - birth.getFullYear();

  const hadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());

  if (!hadBirthday) age--;

  return age;
}

function filled(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

// True when every required biodata field (and the photo) is present.
export function isBiodataComplete(
  row: Partial<BiodataRow> | null | undefined
): boolean {
  if (!row) return false;

  const required = [
    row.date_of_birth,
    row.gender,
    row.phone_number,
    row.whatsapp_number,
    row.home_address,
    row.state_of_residence,
    row.country,
    row.bio,
    row.emergency_contact_name,
    row.emergency_contact_phone,
    row.profile_photo_url,
  ];

  if (!required.every(filled)) return false;

  const age = calculateAge(row.date_of_birth as string);

  if (age !== null && age < 18) {
    return filled(row.guardian_name) && filled(row.guardian_phone);
  }

  return true;
}

function validPhone(value: string): boolean {
  const cleaned = value.replace(/[\s\-().]/g, "");
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

export default function StudentProfile({
  matNumber,
  onSaved,
}: {
  matNumber: string;
  onSaved?: (complete: boolean) => void;
}) {
  const { profile, session } = useAuth();

  const [form, setForm] = useState<BiodataForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [hasRow, setHasRow] = useState(false);

  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const uid = session?.user?.id;
  const age = calculateAge(form.date_of_birth);
  const isMinor = age !== null && age < 18;

  const update =
    (key: keyof BiodataForm) =>
    (
      e: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  async function signedUrlFor(path: string | null) {
    if (!path) {
      setPhotoUrl("");
      return;
    }

    const { data } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(path, 3600);

    setPhotoUrl(data?.signedUrl ?? "");
  }

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);

      const { data: rawData, error: loadError } = await supabase
        .from("student_biodata")
        .select(BIODATA_COLUMNS)
        .eq("user_id", uid)
        .maybeSingle();

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      const data = rawData as unknown as BiodataRow | null;

      if (data) {
        setHasRow(true);

        setForm({
          date_of_birth: data.date_of_birth ?? "",
          gender: data.gender ?? "",
          phone_number: data.phone_number ?? "",
          whatsapp_number: data.whatsapp_number ?? "",
          home_address: data.home_address ?? "",
          state_of_residence: data.state_of_residence ?? "",
          country: data.country ?? "Nigeria",
          bio: data.bio ?? "",
          guardian_name: data.guardian_name ?? "",
          guardian_phone: data.guardian_phone ?? "",
          emergency_contact_name: data.emergency_contact_name ?? "",
          emergency_contact_phone: data.emergency_contact_phone ?? "",
        });

        setPhotoPath(data.profile_photo_url ?? null);
        await signedUrlFor(data.profile_photo_url ?? null);
      } else {
        // Pre-fill what the account already knows.
        setForm((prev) => ({
          ...prev,
          whatsapp_number: profile?.whatsapp ?? "",
        }));
      }

      if (active) setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  function selectPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    setError("");
    setNewPhoto(null);
    setNewPhotoPreview("");

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Upload a JPG, PNG, or WEBP photo.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your photo must not exceed 5 MB.");
      e.target.value = "";
      return;
    }

    setNewPhoto(file);
    setNewPhotoPreview(URL.createObjectURL(file));
  }

  async function save(e: FormEvent) {
    e.preventDefault();

    setError("");
    setMsg("");

    if (!uid) {
      setError("Please log in again.");
      return;
    }

    if (!form.date_of_birth || age === null) {
      setError("Enter a valid date of birth.");
      return;
    }

    if (!validPhone(form.phone_number)) {
      setError("Enter a valid phone number, for example +2348012345678.");
      return;
    }

    if (!validPhone(form.whatsapp_number)) {
      setError("Enter a valid WhatsApp number, for example +2348012345678.");
      return;
    }

    if (isMinor && (!filled(form.guardian_name) || !filled(form.guardian_phone))) {
      setError("Students under 18 must provide parent/guardian details.");
      return;
    }

    if (!photoPath && !newPhoto) {
      setError("Please add a profile photo.");
      return;
    }

    setBusy(true);

    let finalPath = photoPath;

    if (newPhoto) {
      const ext = newPhoto.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, newPhoto, {
          upsert: false,
          contentType: newPhoto.type,
        });

      if (uploadError) {
        setBusy(false);
        setError(`Photo upload failed: ${uploadError.message}`);
        return;
      }

      finalPath = path;
    }

    const payload = {
      user_id: uid,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      phone_number: form.phone_number.trim(),
      whatsapp_number: form.whatsapp_number.trim(),
      home_address: form.home_address.trim(),
      state_of_residence: form.state_of_residence.trim(),
      country: form.country.trim(),
      bio: form.bio.trim(),
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_phone: form.emergency_contact_phone.trim(),
      profile_photo_url: finalPath,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("student_biodata")
      .upsert(payload, { onConflict: "user_id" });

    setBusy(false);

    if (saveError) {
      setError(`Could not save your profile: ${saveError.message}`);
      return;
    }

    setHasRow(true);
    setPhotoPath(finalPath);
    setNewPhoto(null);
    setNewPhotoPreview("");
    await signedUrlFor(finalPath);

    setMsg("Profile saved.");
    onSaved?.(true);
  }

  if (loading) {
    return <p className="muted">Loading your profile…</p>;
  }

  const shownPhoto = newPhotoPreview || photoUrl;

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {shownPhoto ? (
            <img
              src={shownPhoto}
              alt="Your profile"
              style={{
                width: 96,
                height: 96,
                objectFit: "cover",
                borderRadius: 12,
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 12,
                background: "#e5e7eb",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
              }}
            >
              👤
            </div>
          )}

          <div>
            <h2 style={{ margin: 0 }}>{profile?.full_name}</h2>
            <p className="muted" style={{ margin: "4px 0" }}>
              MatNumber: <b>{matNumber}</b>
            </p>
            <p className="muted" style={{ margin: "4px 0" }}>
              {profile?.email && !profile.email.endsWith(".invalid")
                ? profile.email
                : "No email on file"}
            </p>
          </div>
        </div>
      </div>

      {!hasRow && (
        <div className="card">
          <b>Your profile is not complete yet.</b>
          <p className="muted">
            Please fill in the form below so the academy has your details.
          </p>
        </div>
      )}

      <form className="card" onSubmit={save}>
        <h2>Bio data</h2>

        <label>Date of birth</label>
        <input
          type="date"
          value={form.date_of_birth}
          onChange={update("date_of_birth")}
          max={new Date().toISOString().split("T")[0]}
          required
        />

        {age !== null && (
          <p className="muted">
            Age: {age} years.{" "}
            {isMinor
              ? "Parent or guardian details are required."
              : "Parent or guardian details are optional."}
          </p>
        )}

        <label>Gender</label>
        <select value={form.gender} onChange={update("gender")} required>
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Prefer not to say">Prefer not to say</option>
        </select>

        <label>Phone number</label>
        <input
          type="tel"
          value={form.phone_number}
          onChange={update("phone_number")}
          placeholder="+234..."
          required
        />

        <label>WhatsApp number</label>
        <input
          type="tel"
          value={form.whatsapp_number}
          onChange={update("whatsapp_number")}
          placeholder="+234..."
          required
        />

        <label>Home address</label>
        <textarea
          value={form.home_address}
          onChange={update("home_address")}
          rows={3}
          required
        />

        <label>State of residence</label>
        <input
          value={form.state_of_residence}
          onChange={update("state_of_residence")}
          required
        />

        <label>Country</label>
        <input
          value={form.country}
          onChange={update("country")}
          required
        />

        <h3>Parent / Guardian</h3>

        <label>Name {isMinor ? "(required)" : "(optional)"}</label>
        <input
          value={form.guardian_name}
          onChange={update("guardian_name")}
          required={isMinor}
        />

        <label>Phone {isMinor ? "(required)" : "(optional)"}</label>
        <input
          type="tel"
          value={form.guardian_phone}
          onChange={update("guardian_phone")}
          placeholder="+234..."
          required={isMinor}
        />

        <h3>Emergency contact</h3>

        <label>Name</label>
        <input
          value={form.emergency_contact_name}
          onChange={update("emergency_contact_name")}
          required
        />

        <label>Phone</label>
        <input
          type="tel"
          value={form.emergency_contact_phone}
          onChange={update("emergency_contact_phone")}
          placeholder="+234..."
          required
        />

        <label>About you</label>
        <textarea
          value={form.bio}
          onChange={update("bio")}
          rows={4}
          minLength={10}
          placeholder="Tell us about yourself, your interests and goals."
          required
        />

        <h3>Profile photo</h3>

        <p className="muted">
          JPG, PNG or WEBP. Maximum 5 MB.
          {photoPath ? " Choose a file only if you want to replace it." : ""}
        </p>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={selectPhoto}
        />

        {error && <div className="err">{error}</div>}
        {msg && <div className="ok">{msg}</div>}

        <button disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}