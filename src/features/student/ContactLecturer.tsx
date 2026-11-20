import { useState } from "react";
import { supabase } from "../../lib/supabase";

type Contact = {
  kind: "lecturer" | "support";
  course_title: string | null;
  full_name: string;
  whatsapp: string | null;
  email: string | null;
};

type Channel = "whatsapp" | "email";

// Used when no lecturer has an email address on file yet.
const ACADEMY_EMAIL = "contactblissacademy@gmail.com";

const MENU_BG = "#ffffff";
const MENU_TEXT = "#111827";
const MENU_BORDER = "#d1d5db";

function whatsappLink(number: string, message: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function mailLink(address: string, subject: string, body: string) {
  return (
    `mailto:${address}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  );
}

export default function ContactLecturer({
  studentName,
  matNumber,
}: {
  studentName: string;
  matNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const intro = `Hello, I am ${studentName} (${matNumber}), a student at BLISS Academy. `;

  async function loadContacts() {
    setLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("get_my_lecturers");

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setContacts((data ?? []) as Contact[]);
    setLoaded(true);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    setChannel(null);

    if (next && !loaded && !loading) {
      void loadContacts();
    }
  }

  function close() {
    setOpen(false);
    setChannel(null);
  }

  const whatsappContacts = contacts.filter((c) => !!c.whatsapp);
  const emailContacts = contacts.filter((c) => !!c.email);
  const usingSupport =
    contacts.length > 0 && contacts.every((c) => c.kind === "support");

  function label(c: Contact) {
    return c.kind === "lecturer"
      ? c.course_title
        ? `${c.full_name} • ${c.course_title}`
        : c.full_name
      : `${c.full_name} • Academy support`;
  }

  const rowStyle = {
    display: "block",
    width: "100%",
    boxSizing: "border-box" as const,
    margin: "6px 0 0",
    padding: 10,
    borderRadius: 10,
    border: `1px solid ${MENU_BORDER}`,
    background: "#ffffff",
    color: MENU_TEXT,
    textAlign: "left" as const,
    textDecoration: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        style={{ width: "auto", margin: 0 }}
      >
        💬 Contact lecturer {open ? "▴" : "▾"}
      </button>

      {open && (
        <>
          <div
            onClick={close}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 998,
              background: "rgba(0,0,0,0.35)",
            }}
          />

          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 999,
              width: "min(340px, 92vw)",
              maxHeight: "65vh",
              overflowY: "auto",
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${MENU_BORDER}`,
              background: MENU_BG,
              color: MENU_TEXT,
              boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            }}
          >
            {loading && <p style={{ margin: 8 }}>Loading…</p>}

            {error && (
              <div className="err" style={{ margin: 4 }}>
                {error}
              </div>
            )}

            {!loading && !error && channel === null && (
              <>
                <div style={{ padding: "4px 6px 8px", fontWeight: 600 }}>
                  How would you like to reach your lecturer?
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setChannel("whatsapp")}
                  style={rowStyle}
                >
                  <strong>💬 WhatsApp</strong>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setChannel("email")}
                  style={rowStyle}
                >
                  <strong>✉️ Email</strong>
                </button>
              </>
            )}

            {!loading && !error && channel !== null && (
              <>
                <button
                  type="button"
                  onClick={() => setChannel(null)}
                  style={{
                    ...rowStyle,
                    margin: "0 0 6px",
                    width: "auto",
                    display: "inline-block",
                    padding: "6px 10px",
                  }}
                >
                  ← Back
                </button>

                <div style={{ padding: "4px 6px", fontWeight: 600 }}>
                  {channel === "whatsapp" ? "WhatsApp" : "Email"}
                </div>

                {usingSupport && (
                  <p
                    style={{
                      margin: "4px 6px 8px",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    No lecturer has been assigned to your course yet. You can
                    reach the academy team instead.
                  </p>
                )}

                {channel === "whatsapp" &&
                  (whatsappContacts.length > 0 ? (
                    whatsappContacts.map((c, i) => (
                      <a
                        key={`${c.full_name}-${i}`}
                        href={whatsappLink(c.whatsapp as string, intro)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={close}
                        style={rowStyle}
                      >
                        <strong>{label(c)}</strong>
                        <br />
                        <small>Open WhatsApp chat</small>
                      </a>
                    ))
                  ) : (
                    <p style={{ margin: 8 }}>
                      No WhatsApp number is available yet. Try email instead.
                    </p>
                  ))}

                {channel === "email" &&
                  (emailContacts.length > 0 ? (
                    emailContacts.map((c, i) => (
                      <a
                        key={`${c.full_name}-${i}`}
                        href={mailLink(
                          c.email as string,
                          `Question from ${studentName} (${matNumber})`,
                          intro
                        )}
                        onClick={close}
                        style={rowStyle}
                      >
                        <strong>{label(c)}</strong>
                        <br />
                        <small>Write an email</small>
                      </a>
                    ))
                  ) : (
                    <a
                      href={mailLink(
                        ACADEMY_EMAIL,
                        `Question from ${studentName} (${matNumber})`,
                        intro
                      )}
                      onClick={close}
                      style={rowStyle}
                    >
                      <strong>BLISS Academy office</strong>
                      <br />
                      <small>{ACADEMY_EMAIL}</small>
                    </a>
                  ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}