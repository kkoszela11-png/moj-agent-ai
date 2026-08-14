import ChatUI from "../components/ChatUI";

export default function OfertaPage() {
  return (
    <ChatUI
      api="/api/oferta"
      title="💼 Generator ofert handlowych"
      subtitle="Podaj temat, a agent zwróci gotową ofertę w jednolitym formacie"
      placeholder="np. /oferta pakiet fotografii produktowej"
      markdown
      images
      suggestions={[
        "/oferta pakiet startowy dla nowego sklepu internetowego",
        "/oferta hurtowa współpraca B2B — akcesoria GSM",
        "/oferta sesja zdjęciowa produktów do e-commerce",
        "/oferta abonament na obsługę social media sklepu",
      ]}
    />
  );
}
