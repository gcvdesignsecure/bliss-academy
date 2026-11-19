
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AdminNav from "./AdminNav";

type SettingsMap = Record<string, any>;

const DEFAULTS: SettingsMap = {
  platform_features: {
    registration_free: true,
    email_verification_required: false,
    kyc_required: false,
    payment_required: false,
    parental_consent_required: false,
    course_applications_enabled: true,
    lms_enabled: true,
    certificates_enabled: true,
  },
  payment_configuration: {
    enabled: false,
    mode: "payment_link",
    provider: "",
    payment_url: "",
    currency: "NGN",
    default_course_fee_kobo: 1500000,
  },
  kyc_configuration: {
    enabled: false,
    provider: "",
    verification_url: "",
    required_for: ["admission"],
    methods: [],
  },
  parental_configuration: {
    enabled: false,
    minimum_age: 18,
    consent_required_below_minimum: true,
  },
  lms_configuration: {
    enabled: true,
    whatsapp_lectures_enabled: false,
    certificates_enabled: true,
    separate_course_classrooms: true,
  },
};

const PROVIDERS = {
  payment: ["Paystack", "Flutterwave", "TransactPay", "Custom"],
  kyc: ["Prembly", "Dojah", "Smile Identity", "Custom"],
};

function Toggle({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
      <div>
        <strong>{label}</strong>
        {description && <p className="muted" style={{ margin: "4px 0 0" }}>{description}</p>}
      </div>
      <button
        type="button"
        className={value ? "" : "ghost"}
        onClick={() => onChange(!value)}
        style={{ minWidth: 90 }}
      >
        {value ? "ON" : "OFF"}
      </button>
    </div>
  );
}

export default function AdminPlatformSettings() {
  const [settings, setSettings] = useState<SettingsMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", Object.keys(DEFAULTS));

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const merged: SettingsMap = { ...DEFAULTS };

    for (const row of data ?? []) {
      if (row.key in DEFAULTS && row.value) {
        merged[row.key] = {
          ...DEFAULTS[row.key],
          ...row.value,
        };
      }
    }

    setSettings(merged);
    setLoading(false);
  }

  function update(section: string, field: string, value: any) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
    setMessage("");
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("Your session has expired. Please log in again.");
      setSaving(false);
      return;
    }

    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error: saveError } = await supabase
      .from("app_settings")
      .upsert(rows, { onConflict: "key" });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage("Platform settings saved successfully.");
  }

  const f = settings.platform_features;
  const p = settings.payment_configuration;
  const k = settings.kyc_configuration;
  const parent = settings.parental_configuration;
  const lms = settings.lms_configuration;

  if (loading) {
    return <div className="wrap wide"><p>Loading platform settings…</p></div>;
  }

  return (
    <div className="wrap wide">
      <h1>Platform Configuration</h1>
      <p className="muted">
        Control BLISS Academy features, payments, verification, consent and LMS behavior.
      </p>

      <AdminNav />

      <section className="card">
        <h2>Student Access & Requirements</h2>

        <Toggle
          label="Free registration"
          value={f.registration_free}
          onChange={(v) => update("platform_features", "registration_free", v)}
          description="Allow students to create accounts without registration fees."
        />

        <Toggle
          label="Require email verification"
          value={f.email_verification_required}
          onChange={(v) => update("platform_features", "email_verification_required", v)}
          description="When enabled, email verification can be required before access."
        />

        <Toggle
          label="Require KYC"
          value={f.kyc_required}
          onChange={(v) => update("platform_features", "kyc_required", v)}
        />

        <Toggle
          label="Require payment"
          value={f.payment_required}
          onChange={(v) => update("platform_features", "payment_required", v)}
        />

        <Toggle
          label="Require parental consent"
          value={f.parental_consent_required}
          onChange={(v) => update("platform_features", "parental_consent_required", v)}
        />

        <Toggle
          label="Course applications"
          value={f.course_applications_enabled}
          onChange={(v) => update("platform_features", "course_applications_enabled", v)}
        />
      </section>

      <section className="card">
        <h2>Payment Configuration</h2>

        <Toggle
          label="Enable payments"
          value={p.enabled}
          onChange={(v) => update("payment_configuration", "enabled", v)}
        />

        <label>Payment provider</label>
        <select
          value={p.provider || ""}
          onChange={(e) => update("payment_configuration", "provider", e.target.value)}
        >
          <option value="">Select provider</option>
          {PROVIDERS.payment.map((provider) => (
            <option key={provider} value={provider.toLowerCase().replace(/\s/g, "_")}>
              {provider}
            </option>
          ))}
        </select>

        <label>Payment mode</label>
        <select
          value={p.mode}
          onChange={(e) => update("payment_configuration", "mode", e.target.value)}
        >
          <option value="payment_link">Hosted payment link</option>
          <option value="api">API integration</option>
        </select>

        <label>Payment page URL</label>
        <input
          type="url"
          placeholder="https://paystack.shop/pay/..."
          value={p.payment_url || ""}
          onChange={(e) => update("payment_configuration", "payment_url", e.target.value)}
        />

        <label>Currency</label>
        <input
          value={p.currency}
          onChange={(e) => update("payment_configuration", "currency", e.target.value.toUpperCase())}
        />

        <label>Default course fee (₦)</label>
        <input
          type="number"
          min="0"
          value={Math.round((p.default_course_fee_kobo || 0) / 100)}
          onChange={(e) =>
            update("payment_configuration", "default_course_fee_kobo", Number(e.target.value) * 100)
          }
        />

        <p className="muted">
          Payment link mode redirects students to your hosted checkout. API mode requires
          a backend provider integration and secure credentials.
        </p>
      </section>

      <section className="card">
        <h2>KYC Configuration</h2>

        <Toggle
          label="Enable identity verification"
          value={k.enabled}
          onChange={(v) => update("kyc_configuration", "enabled", v)}
        />

        <label>KYC provider</label>
        <select
          value={k.provider || ""}
          onChange={(e) => update("kyc_configuration", "provider", e.target.value)}
        >
          <option value="">Select provider</option>
          {PROVIDERS.kyc.map((provider) => (
            <option key={provider} value={provider.toLowerCase().replace(/\s/g, "_")}>
              {provider}
            </option>
          ))}
        </select>

        <label>Verification URL</label>
        <input
          type="url"
          placeholder="https://provider.com/verification..."
          value={k.verification_url || ""}
          onChange={(e) => update("kyc_configuration", "verification_url", e.target.value)}
        />

        <p className="muted">
          Provider API keys must be stored securely in Supabase, never in this page.
          Entering a URL alone does not create a complete KYC integration.
        </p>
      </section>

      <section className="card">
        <h2>Parental Consent</h2>

        <Toggle
          label="Enable parental consent"
          value={parent.enabled}
          onChange={(v) => update("parental_configuration", "enabled", v)}
        />

        <label>Minimum student age</label>
        <input
          type="number"
          min="1"
          max="100"
          value={parent.minimum_age}
          onChange={(e) => update("parental_configuration", "minimum_age", Number(e.target.value))}
        />

        <Toggle
          label="Require consent below minimum age"
          value={parent.consent_required_below_minimum}
          onChange={(v) =>
            update("parental_configuration", "consent_required_below_minimum", v)
          }
        />
      </section>

      <section className="card">
        <h2>LMS & Academic Settings</h2>

        <Toggle
          label="Enable LMS"
          value={lms.enabled}
          onChange={(v) => update("lms_configuration", "enabled", v)}
        />

        <Toggle
          label="Enable WhatsApp lectures"
          value={lms.whatsapp_lectures_enabled}
          onChange={(v) => update("lms_configuration", "whatsapp_lectures_enabled", v)}
        />

        <Toggle
          label="Certificates enabled"
          value={lms.certificates_enabled}
          onChange={(v) => update("lms_configuration", "certificates_enabled", v)}
        />

        <Toggle
          label="Separate classroom for each course"
          value={lms.separate_course_classrooms}
          onChange={(v) => update("lms_configuration", "separate_course_classrooms", v)}
        />
      </section>

      {error && <div className="err">{error}</div>}
      {message && <div className="ok">{message}</div>}

      <button onClick={saveSettings} disabled={saving}>
        {saving ? "Saving settings…" : "Save Platform Settings"}
      </button>

      <button type="button" className="ghost" onClick={loadSettings} disabled={saving}>
        Reload from database
      </button>
    </div>
  );
}
