import ChatUI from "../components/ChatUI";

export default function SearchPage() {
  return (
    <ChatUI
      api="/api/search"
      title="🌐 Agent z wyszukiwarką"
      subtitle="Przeszukuję prawdziwy internet i czytam strony"
      placeholder="Zapytaj o cokolwiek aktualnego…"
      markdown
      images
      suggestions={[
        "Jakie są najnowsze wiadomości o sztucznej inteligencji?",
        "Ile kosztuje iPhone 16 Pro w Polsce?",
        "Kto wygrał ostatni mecz reprezentacji Polski?",
        "Przeczytaj: https://pl.wikipedia.org/wiki/Sztuczna_inteligencja",
      ]}
    />
  );
}
