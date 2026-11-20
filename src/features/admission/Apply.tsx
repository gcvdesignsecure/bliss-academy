// EDIT FILE: src/features/admission/Apply.tsx

import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import VerifyContact from "./VerifyContact";
import ChooseCourse, { StudentReady } from "./ChooseCourse";

type PlatformFeatures = {
  email_verification_required: boolean;
  kyc_required: boolean;
};

const DEFAULT_FEATURES: PlatformFeatures = {
  email_verification_required: false,
  kyc_required: false,
};

type Biodata = {
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

const INITIAL_BIODATA: Biodata = {
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

function calculateAge(dob: string): number | null {
  if (!dob) return null;

  const birth = new Date(`${dob}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(birth.getTime()) || birth > today) {
    return null;
  }

  let age = today.getFullYear() - birth.getFullYear();

  const hasHadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());

  if (!hasHadBirthday) age--;

  return age;
}

export default function Apply() {
  const { profile, session, signOut } = useAuth();

  const [account, setAccount] = useState({
    full_name: "",
    email: "",
    whatsapp: "",
    country: "Nigeria",
    password: "",
  });

  const [biodata, setBiodata] = useState<Biodata>(INITIAL_BIODATA);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [features, setFeatures] =
    useState<PlatformFeatures>(DEFAULT_FEATURES);

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [newMat, setNewMat] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const age = calculateAge(biodata.date_of_birth);
  const isMinor = age !== null && age < 18;

  const updateBiodata =
    (key: keyof Biodata) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setBiodata((prev) => ({
        ...prev,
        [key]: e.target.value,
      }));
    };

  // Load Owner Admin verification settings.
  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const { data, error: settingsError } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "platform_features")
        .maybeSingle();

      if (!active) return;

      if (!settingsError && data?.value) {
        setFeatures({
          email_verification_required:
            data.value.email_verification_required === true,
          kyc_required: data.value.kyc_required === true,
        });
      }

      setSettingsLoaded(true);
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  // Load applicant admission status.
  useEffect(() => {
    if (!session?.user?.id) {
      setLoaded(true);
      setStatus(null);
      return;
    }

    let active = true;

    async function loadAdmission() {
      const { data, error: admissionError } = await supabase
        .from("admissions")
        .select("status")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!active) return;

      if (!admissionError) {
        setStatus(data?.[0]?.status ?? null);
      }

      setLoaded(true);
    }

    void loadAdmission();

    return () => {
      active = false;
    };
  }, [session]);

  // Registration.
  async function signUp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");

    const whatsapp = account.whatsapp.replace(/[\s\-().]/g, "");

    if (!/^\+?[0-9]{7,15}$/.test(whatsapp)) {
      setError("Enter a valid WhatsApp number.");
      setBusy(false);
      return;
    }

    if (account.country.trim().length < 2) {
      setError("Country is required.");
      setBusy(false);
      return;
    }

    const { data, error: signupError } =
      await supabase.auth.signUp({
        email: account.email.trim(),
        password: account.password,
        options: {
          data: {
            full_name: account.full_name.trim(),
            whatsapp: whatsapp,
            country: account.country.trim(),
          },
        },
      });

    setBusy(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      setMsg("Account created. Continue completing your applicant biodata.");
    } else {
      setMsg(
        "Account created. Please log in after any required email confirmation, then complete your biodata."
      );
    }
  }

  // Photo selection and preview.
  function selectPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    setError("");
    setPhoto(null);
    setPhotoPreview("");

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

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // Save biodata, upload photo, and submit admission.
  async function submitBiodata(e: FormEvent) {
    e.preventDefault();

    setError("");
    setMsg("");

    if (!session?.user?.id) {
      setError("Please log in to complete your biodata.");
      return;
    }

    if (!biodata.date_of_birth || age === null) {
      setError("Enter a valid date of birth.");
      return;
    }

    if (isMinor && (!biodata.guardian_name.trim() || !biodata.guardian_phone.trim())) {
      setError("Students under 18 must provide parent/guardian details.");
      return;
    }

    if (!photo) {
      setError("A profile photo is required for admission.");
      return;
    }

    setBusy(true);

    const uid = session.user.id;
    const fileExt = photo.name.split(".").pop()?.toLowerCase() || "jpg";
    const photoPath = `${uid}/${Date.now()}.${fileExt}`;

    // Upload photo to the private student profile photo bucket.
    const { error: uploadError } = await supabase.storage
      .from("student-profile-photos")
      .upload(photoPath, photo, {
        upsert: false,
        contentType: photo.type,
      });

    if (uploadError) {
      setBusy(false);
      setError(`Photo upload failed: ${uploadError.message}`);
      return;
    }

    const payload = {
      user_id: uid,
      date_of_birth: biodata.date_of_birth,
      gender: biodata.gender,
      phone_number: biodata.phone_number.trim(),
      whatsapp_number: biodata.whatsapp_number.trim(),
      home_address: biodata.home_address.trim(),
      state_of_residence: biodata.state_of_residence.trim(),
      country: biodata.country.trim(),
      bio: biodata.bio.trim(),
      guardian_name: isMinor ? biodata.guardian_name.trim() : biodata.guardian_name.trim() || null,
      guardian_phone: isMinor ?
  biodata.guardian_phone.trim() :
  biodata.guardian_phone.trim() || null,
      emergency_contact_name: biodata.emergency_contact_name.trim(),
      emergency_contact_phone: biodata.emergency_contact_phone.trim(),
      profile_photo_url: photoPath,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("student_biodata")
      .upsert(payload, { onConflict: "user_id" });

    if (saveError) {
      setBusy(false);
      setError(`Could not save biodata: ${saveError.message}`);
      return;
    }

    // Submit the admission using the existing backend RPC.
    const { error: admissionError } = await supabase.rpc(
      "submit_admission",
      {
        p_dob: biodata.date_of_birth,
      }
    );

    setBusy(false);

    if (admissionError) {
      setError(admissionError.message);
      return;
    }

    setStatus("submitted");
    setMsg("Biodata saved and admission application submitted successfully.");
  }

  if (session && newMat) {
    return <StudentReady mat={newMat} />;
  }

  // Logged-in applicant.
  if (session && profile?.role === "applicant") {
    return (
      <div className="wrap wide">
        <h1>BLISS Academy Admission</h1>

        <p className="muted">
          Welcome, {profile.full_name}. Complete your biodata to proceed.
        </p>

        {!settingsLoaded ? (
          <p className="muted">Loading verification settings…</p>
        ) : (
          <>
            {features.email_verification_required && (
              <VerifyContact channel="email" />
            )}

            {!features.email_verification_required &&
              !features.kyc_required && (
                <div className="card">
                  <p className="ok">No additional verification is currently required.</p>
                </div>
              )}

            {!loaded ? (
              <p className="muted">Loading admission status…</p>
            ) : status ? (
              <div className="card">
                <h3>Application status: {status.replace(/_/g, " ")}</h3>

                {status === "submitted" && (
                  <p className="muted">Your application is awaiting review.</p>
                )}

                {status === "under_review" && (
                  <p className="muted">Your application is currently being reviewed.</p>
                )}

                {status === "kyc_pending" && (
                  <p className="muted">Your application requires verification.</p>
                )}

                {status === "approved" && (
                  <>
                    <p className="ok">Your admission has been approved.</p>
                    <ChooseCourse onEnrolled={setNewMat} />
                  </>
                )}

                {status === "rejected" && (
                  <p className="err">Your application was not approved.</p>
                )}
              </div>
            ) : (
              <form className="card" onSubmit={submitBiodata}>
                <h2>Student Biodata</h2>

                <p className="muted">
                  Complete every required field. Your age is calculated automatically from your date of birth.
                </p>

                <label>Date of birth</label>
                <input
                  type="date"
                  value={biodata.date_of_birth}
                  onChange={updateBiodata("date_of_birth")}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />

                {age !== null && (
                  <div className="card">
                    <b>Your calculated age: {age} years</b>
                    <p className="muted">
                      {isMinor
                        ? "You are under 18. Parent or guardian information is required."
                        : "You are 18 or older. Parent or guardian information is optional."}
                    </p>
                  </div>
                )}

                <label>Gender</label>
                <select
                  value={biodata.gender}
                  onChange={updateBiodata("gender")}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>

                <label>Phone number</label>
                <input
                  type="tel"
                  value={biodata.phone_number}
                  onChange={updateBiodata("phone_number")}
                  placeholder="+234..."
                  required
                />

                <label>WhatsApp number</label>
                <input
                  type="tel"
                  value={biodata.whatsapp_number}
                  onChange={updateBiodata("whatsapp_number")}
                  placeholder="+234..."
                  required
                />

                <label>Home address</label>
                <textarea
                  value={biodata.home_address}
                  onChange={updateBiodata("home_address")}
                  required
                  rows={3}
                />

                <label>State of residence</label>
                <input
                  value={biodata.state_of_residence}
                  onChange={updateBiodata("state_of_residence")}
                  required
                />

                <label>Country</label>
                <input
                  value={biodata.country}
                  onChange={updateBiodata("country")}
                  required
                />

                <h3>Parent / Guardian Information</h3>

                {!isMinor && (
                  <p className="muted">
                    These details are optional for students aged 18 and above.
                  </p>
                )}

                <label>Parent / Guardian name {isMinor ? "(Required)" : "(Optional)"}</label>
                <input
                  value={biodata.guardian_name}
                  onChange={updateBiodata("guardian_name")}
                  required={isMinor}
                />

                <label>Parent / Guardian phone {isMinor ? "(Required)" : "(Optional)"}</label>
                <input
                  type="tel"
                  value={biodata.guardian_phone}
                  onChange={updateBiodata("guardian_phone")}
                  required={isMinor}
                  placeholder="+234..."
                />

                <h3>Emergency Contact</h3>

                <label>Emergency contact name</label>
                <input
                  value={biodata.emergency_contact_name}
                  onChange={updateBiodata("emergency_contact_name")}
                  required
                />

                <label>Emergency contact phone</label>
                <input
                  type="tel"
                  value={biodata.emergency_contact_phone}
                  onChange={updateBiodata("emergency_contact_phone")}
                  required
                />

                <label>Student bio</label>
                <textarea
                  value={biodata.bio}
                  onChange={updateBiodata("bio")}
                  rows={4}
                  minLength={10}
                  placeholder="Tell us about yourself, your interests, goals, and why you want to study at BLISS Academy."
                  required
                />

                <h3>Student Profile Photo</h3>

                <p className="muted">
                  A clear photo is required before your admission can be approved. JPG, PNG, or WEBP. Maximum 5 MB.
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectPhoto}
                  required
                />

                {photoPreview && (
                  <div className="card">
                    <img
                      src={photoPreview}
                      alt="Student profile preview"
                      style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "12px",
                      }}
                    />
                    <p className="ok">Photo selected</p>
                  </div>
                )}

                {error && <div className="err">{error}</div>}
                {msg && <div className="ok">{msg}</div>}

                <button disabled={busy || age === null}>
                  {busy ? "Saving biodata…" : "Submit biodata and application"}
                </button>
              </form>
            )}
          </>
        )}

        <button type="button" className="ghost" onClick={signOut}>
          Log out
        </button>
      </div>
    );
  }

  // Already authenticated with another role.
  if (session && profile && profile.role !== "applicant") {
    return (
      <div className="wrap">
        <h1>BLISS Academy</h1>
        <p>You are already signed in.</p>
        <Link to={profile.role === "superadmin" ? "/admin/overview" : "/dashboard"}>
          <button>Go to my dashboard</button>
        </Link>
      </div>
    );
  }

  // New account registration.
  return (
    <form className="wrap" onSubmit={signUp}>
      <h1>Apply to BLISS Academy</h1>

      <label>Full legal name</label>
      <input
        value={account.full_name}
        onChange={(e) => setAccount({ ...account, full_name: e.target.value })}
        required
        minLength={2}
      />

      <label>Email</label>
      <input
        type="email"
        value={account.email}
        onChange={(e) => setAccount({ ...account, email: e.target.value })}
        required
      />

      <label>WhatsApp number</label>
      <input
        type="tel"
        value={account.whatsapp}
        onChange={(e) => setAccount({ ...account, whatsapp: e.target.value })}
        placeholder="+2348012345678"
        required
      />

      <label>Country</label>
      <input
        value={account.country}
        onChange={(e) => setAccount({ ...account, country: e.target.value })}
        required
      />

      <label>Password</label>
      <input
        type="password"
        minLength={8}
        value={account.password}
        onChange={(e) => setAccount({ ...account, password: e.target.value })}
        required
      />

      {error && <div className="err">{error}</div>}
      {msg && <div className="ok">{msg}</div>}

      <button disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>

      <p className="muted">
        Already applied? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}