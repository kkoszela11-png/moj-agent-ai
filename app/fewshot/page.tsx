import ChatUI from "../components/ChatUI";

export default function FewShotPage() {
  return (
    <ChatUI
      api="/api/fewshot"
      title="📚 Słownik AI"
      subtitle="Wyjaśniam trudne pojęcia prostym językiem"
      placeholder="Wpisz pojęcie do wyjaśnienia…"
      markdown
      images
      suggestions={[
        "Sztuczna inteligencja",
        "Agent AI",
        "Prompt",
        "Halucynacja AI",
        "RAG",
        "API",
      ]}
    />
  );
}
