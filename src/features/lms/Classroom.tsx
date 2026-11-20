
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

type Lesson = {
  id: string;
  class_number: number;
  month_number: number;
  title: string;
  description: string;
  lesson_content: any;
  starter_html: string;
  starter_css: string;
  starter_js: string;
};

type Progress = {
  lesson_id: string;
  unlocked: boolean;
  completed: boolean;
  best_score: number;
  attempts_count: number;
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: any[];
  question_type: string;
  difficulty: string;
};

const initialHTML = `<h1>Hello, BLISS Academy!</h1>
<p>My first webpage.</p>
<button id="helloBtn">Click me</button>`;

const initialCSS = `body {
  font-family: Arial, sans-serif;
  padding: 20px;
}

h1 {
  color: #2563eb;
}

button {
  padding: 10px 16px;
  cursor: pointer;
}`;

const initialJS = `document.getElementById("helloBtn")
  ?.addEventListener("click", () => {
    alert("Hello student!");
  });`;

export default function Classroom() {
  const { courseId } = useParams();
  const { session, profile } = useAuth();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [current, setCurrent] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [html, setHTML] = useState(initialHTML);
  const [css, setCSS] = useState(initialCSS);
  const [js, setJS] = useState(initialJS);
  const [preview, setPreview] = useState(false);

  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"lesson" | "practice" | "test">("lesson");

  const uid = session?.user?.id;

  async function refreshProgress() {
    if (!uid) return;

    const { data, error: pError } = await supabase
      .from("lesson_progress")
      .select("lesson_id,unlocked,completed,best_score,attempts_count")
      .eq("student_id", uid);

    if (pError) throw pError;
    setProgress((data || []) as Progress[]);
  }

  useEffect(() => {
    if (!courseId || !uid) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      const { data: lessonData, error: lessonError } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("class_number");

      if (!active) return;

      if (lessonError) {
        setError(lessonError.message);
        setLoading(false);
        return;
      }

      setLessons((lessonData || []) as Lesson[]);

      const { data: pData, error: pError } = await supabase
        .from("lesson_progress")
        .select("lesson_id,unlocked,completed,best_score,attempts_count")
        .eq("student_id", uid);

      if (!active) return;

      if (pError) {
        setError(pError.message);
        setLoading(false);
        return;
      }

      const p = (pData || []) as Progress[];
      setProgress(p);

      const firstUnlocked =
        (lessonData || []).find((l: Lesson) =>
          p.some((item) => item.lesson_id === l.id && item.unlocked)
        ) || (lessonData || [])[0];

      if (firstUnlocked) setCurrent(firstUnlocked as Lesson);

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [courseId, uid]);

  function selectLesson(lesson: Lesson) {
    const p = progress.find((x) => x.lesson_id === lesson.id);

    if (!p?.unlocked) return;

    setCurrent(lesson);
    setActiveTab("lesson");
    setQuiz([]);
    setAnswers({});
    setQuizResult(null);
    setPreview(false);

    setHTML(lesson.starter_html || initialHTML);
    setCSS(lesson.starter_css || initialCSS);
    setJS(lesson.starter_js || initialJS);
  }

  const currentProgress = useMemo(
    () => progress.find((p) => p.lesson_id === current?.id),
    [progress, current]
  );

  const srcDoc = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css}</style>
</head>
<body>
${html}
<script>
try {
${js}
} catch (error) {
  document.body.insertAdjacentHTML(
    "beforeend",
    '<pre style="color:red">' + error.message + '</pre>'
  );
}
<\/script>
</body>
</html>`;
  }, [html, css, js]);

  async function startQuiz() {
    if (!current) return;

    setQuizLoading(true);
    setError("");
    setQuizResult(null);
    setAnswers({});

    const { data, error: rpcError } = await supabase.rpc(
      "get_lesson_quiz",
      {
        p_lesson_id: current.id,
        p_question_count: 10,
      }
    );

    if (rpcError) {
      setError(
        rpcError.message.includes("question")
          ? "There are no questions available for this class yet."
          : rpcError.message
      );
      setQuizLoading(false);
      return;
    }

    const items = (data || []) as QuizQuestion[];

    if (!items.length) {
      setError("No questions have been added to this class yet.");
      setQuizLoading(false);
      return;
    }

    setQuiz(items);
    setActiveTab("test");
    setQuizLoading(false);
  }

  async function submitQuiz() {
    if (!current || !quiz.length) return;

    if (Object.keys(answers).length !== quiz.length) {
      setError("Answer every question before submitting.");
      return;
    }

    setQuizLoading(true);
    setError("");

    const questionIds = quiz.map((q) => q.id);

    const { data, error: rpcError } = await supabase.rpc(
      "submit_lesson_quiz",
      {
        p_lesson_id: current.id,
        p_question_ids: questionIds,
        p_answers: answers,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setQuizLoading(false);
      return;
    }

    setQuizResult(data);
    await refreshProgress();

    setQuizLoading(false);
  }

  function optionValue(option: any) {
    if (typeof option === "string") return option;
    return option?.value ?? option?.id ?? option?.text ?? option?.label;
  }

  function optionLabel(option: any) {
    if (typeof option === "string") return option;
    return option?.label ?? option?.text ?? option?.value ?? "";
  }

  if (loading) {
    return <div className="wrap">Loading classroom…</div>;
  }

  if (error && !lessons.length) {
    return (
      <div className="wrap">
        <h2>Classroom</h2>
        <div className="err">{error}</div>
        <Link to="/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="wrap wide" style={{ paddingBottom: 40 }}>
      <Link to="/dashboard">← Student Dashboard</Link>

      <h1>BLISS Classroom</h1>

      <p className="muted">
        Learn at your own pace. Pass each class test with
        every answer correct to unlock the next class.
      </p>

      <div className="card">
        <h2>Course Classes</h2>
        <p>{lessons.length} classes available</p>

        <div style={{ display: "grid", gap: 8 }}>
          {lessons.map((lesson) => {
            const p = progress.find(
              (item) => item.lesson_id === lesson.id
            );

            const unlocked = !!p?.unlocked;
            const completed = !!p?.completed;

            return (
              <button
                key={lesson.id}
                disabled={!unlocked}
                onClick={() => selectLesson(lesson)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 10,
                  border: current?.id === lesson.id
                    ? "2px solid #2563eb"
                    : "1px solid var(--border)",
                  opacity: unlocked ? 1 : 0.55,
                  background: completed
                    ? "#e9f8ef"
                    : "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <strong>
                  {unlocked ? "▶" : "🔒"} Class {lesson.class_number}
                </strong>
                <br />
                {lesson.title}
                <br />
                <small>
                  {completed
                    ? `Completed • Best score ${p?.best_score ?? 0}%`
                    : unlocked
                    ? "Available"
                    : "Locked"}
                  {p?.attempts_count
                    ? ` • ${p.attempts_count} attempt(s)`
                    : ""}
                </small>
              </button>
            );
          })}
        </div>
      </div>

      {current && (
        <>
          <div className="card">
            <p className="muted">
              Month {current.month_number} • Class {current.class_number}
            </p>
            <h2>{current.title}</h2>
            <p>{current.description}</p>

            {currentProgress?.completed && (
              <p className="ok">
                Class completed. You can revisit this lesson anytime.
              </p>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setActiveTab("lesson")}>Lesson</button>
              <button onClick={() => setActiveTab("practice")}>Code Practice</button>
              <button onClick={startQuiz} disabled={quizLoading}>
                {quizLoading ? "Loading test…" : "Start Class Test"}
              </button>
            </div>
          </div>

          {activeTab === "lesson" && (
            <div className="card">
              <h2>Lesson Material</h2>

              {current.lesson_content?.sections?.length ? (
                current.lesson_content.sections.map(
                  (section: any, i: number) => (
                    <section key={i}>
                      <h3>{section.heading}</h3>
                      <p>{section.content}</p>
                    </section>
                  )
                )
              ) : (
                <>
                  <p>
                    This lesson's full teaching material is being prepared.
                    Use the class topic to guide your study.
                  </p>
                  <h3>Learning objectives</h3>
                  <ul>
                    <li>Understand the topic of this class.</li>
                    <li>Study the code examples.</li>
                    <li>Complete the practice task.</li>
                    <li>Take the test to unlock the next class.</li>
                  </ul>
                </>
              )}

              {current.lesson_content?.examples?.map(
                (example: any, i: number) => (
                  <div key={i}>
                    <h3>{example.title}</h3>
                    <pre style={{ overflowX: "auto" }}>
                      <code>{example.code}</code>
                    </pre>
                    <p>{example.explanation}</p>
                  </div>
                )
              )}

              {current.lesson_content?.practice_tasks?.map(
                (task: any, i: number) => (
                  <div key={i}>
                    <h3>Practice {i + 1}</h3>
                    <p>{task}</p>
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === "practice" && (
            <div className="card">
              <h2>Code Playground</h2>
              <p className="muted">
                Your code runs in a sandboxed preview.
              </p>

              <label>HTML</label>
              <textarea
                value={html}
                onChange={(e) => setHTML(e.target.value)}
                rows={8}
                style={{ width: "100%", fontFamily: "monospace" }}
              />

              <label>CSS</label>
              <textarea
                value={css}
                onChange={(e) => setCSS(e.target.value)}
                rows={8}
                style={{ width: "100%", fontFamily: "monospace" }}
              />

              <label>JavaScript</label>
              <textarea
                value={js}
                onChange={(e) => setJS(e.target.value)}
                rows={8}
                style={{ width: "100%", fontFamily: "monospace" }}
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setPreview(true)}>Run Code</button>
                <button
                  className="ghost"
                  onClick={() => {
                    setHTML(current.starter_html || initialHTML);
                    setCSS(current.starter_css || initialCSS);
                    setJS(current.starter_js || initialJS);
                    setPreview(false);
                  }}
                >
                  Reset
                </button>
              </div>

              {preview && (
                <div style={{ marginTop: 16 }}>
                  <h3>Live Preview</h3>
                  <iframe
                    title="Student code preview"
                    sandbox="allow-scripts"
                    srcDoc={srcDoc}
                    style={{
                      width: "100%",
                      minHeight: 350,
                      border: "1px solid #aaa",
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "test" && (
            <div className="card">
              <h2>Class Test</h2>
              <p>
                You must answer every question correctly to pass
                and unlock the next class.
              </p>

              {quizResult && (
                <div className="card">
                  <h3>
                    {quizResult.passed ? "🎉 Test Passed!" : "Test Failed"}
                  </h3>
                  <p>
                    Score: {quizResult.correct}/{quizResult.total}
                  </p>
                  <p>
                    {quizResult.passed
                      ? "All answers are correct. The next class is unlocked."
                      : "At least one answer was wrong. Try a new question set."}
                  </p>
                  <button onClick={startQuiz}>
                    {quizResult.passed ? "Practice Again" : "Retry with New Questions"}
                  </button>
                </div>
              )}

              {!quiz.length && !quizResult && (
                <button onClick={startQuiz} disabled={quizLoading}>
                  {quizLoading ? "Loading…" : "Load Questions"}
                </button>
              )}

              {quiz.map((question, index) => (
                <div key={question.id} style={{ margin: "20px 0" }}>
                  <h3>
                    {index + 1}. {question.prompt}
                  </h3>

                  {(question.options || []).map((option: any, i: number) => {
                    const value = optionValue(option);
                    const selected =
                      answers[question.id] === value;

                    return (
                      <label
                        key={i}
                        style={{
                          display: "block",
                          padding: 10,
                          margin: "6px 0",
                          border: selected
                            ? "2px solid #2563eb"
                            : "1px solid var(--border)",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          checked={selected}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: value,
                            }))
                          }
                        />
                        {" "}{optionLabel(option)}
                      </label>
                    );
                  })}
                </div>
              ))}

              {quiz.length > 0 && !quizResult && (
                <button
                  onClick={submitQuiz}
                  disabled={quizLoading}
                >
                  {quizLoading ? "Submitting…" : "Submit Test"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {error && <div className="err">{error}</div>}
    </div>
  );
}
