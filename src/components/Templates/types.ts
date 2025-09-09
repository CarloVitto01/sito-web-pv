export type TemplateCategory =
  | "facciata"
  | "ecommerce"
  | "portfolio"
  | "blog"
  | "booking"
  | "landing"
  | "catalogo"
  | "istituzionale";

export interface TemplateMeta {
  id: string;
  title: string;
  category: TemplateCategory;
  short: string;
  features: string[];
  preview: string;              // Data URI SVG o immagine
  pagesIncluded: string[];
  path: string;                  // <— NUOVO: route per l’anteprima live (es. "/template/facciata-elegante")
  component?: React.LazyExoticComponent<React.ComponentType<any>>;
}
