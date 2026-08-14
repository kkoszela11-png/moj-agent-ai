import ChatUI from "../components/ChatUI";

export default function AgentPage() {
  return (
    <ChatUI
      api="/api/agent"
      title="🤖 Agent AI — narzędzia"
      subtitle="Kalkulator • data/czas • generowanie obrazów — agent sam decyduje"
      placeholder="Zleć zadanie dla narzędzi…"
      markdown
      images
      showTools
      toolsPanel={["🧮 Kalkulator", "🕐 Data i czas", "🎨 Generowanie obrazów"]}
      suggestions={[
        "Ile to 23% VAT z 8500 PLN? Podaj brutto i netto",
        "Jaka jest teraz dokładna data i godzina?",
        "Ile dni zostało do końca 2026 roku?",
        "Wygeneruj minimalistyczne logo dla firmy 'Solgito'",
      ]}
    />
  );
}
