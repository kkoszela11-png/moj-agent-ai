import ChatUI from "@/app/components/ChatUI";

export default function TravelPage() {
  return (
    <ChatUI
      api="/api/travel"
      title="✈️ Asystent podróży AI"
      subtitle="Powiedz dokąd jedziesz — agent zaplanuje trasę, pogodę i koszty"
      placeholder="Np. Lecę do Barcelony na weekend..."
      markdown
      images
      showTools
      showDiagnostics
      toolsPanel={[
        "🧮 Kalkulator",
        "☀️ Pogoda",
        "💱 Kursy walut",
        "🎉 Święta",
        "📚 Wikipedia",
        "📝 Notatki",
      ]}
      suggestions={[
        "Planuję weekend w Berlinie. Budżet: 2000 PLN.",
        "Lecę do Londynu na 4 dni.",
        "Porównaj Pragę i Wiedeń na długi weekend.",
        "Jak przygotować się do podróży do Tokio w kwietniu?",
      ]}
    />
  );
}
