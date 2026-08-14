import ChatUI from "../components/ChatUI";

export default function FormatPage() {
  return (
    <ChatUI
      api="/api/format"
      title="📐 Formatowanie"
      subtitle="Agent odpowiada w tabeli, liście, porównaniu — na żądanie"
      placeholder="Wpisz komendę, np. /tabela ..."
      markdown
      images
      suggestions={[
        "/tabela języki programowania 2026",
        "/porownanie ChatGPT vs Claude",
        "/lista 5 kroków do pierwszego agenta AI",
        "/faq sztuczna inteligencja dla początkujących",
        "/email podziękowanie za udaną rekrutację",
      ]}
    />
  );
}
