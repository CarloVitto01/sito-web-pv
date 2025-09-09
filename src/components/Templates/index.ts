import React from "react";
import type { TemplateMeta } from "./types";
import { placeholderSVG } from "./utils";

const FacciataEleganteDemo = React.lazy(() => import("./templateFacciataElegante/TemplateFacciataElegante"));
const EcommerceEssenzialeDemo = React.lazy(() => import("./templateEcommerceEssenziale/TemplateEcommerceEssenziale"));
const PortfolioCreativoDemo = React.lazy(() => import("./templatePortfolioCreativo/TemplatePortfolioCreativo"));
const LandingConversioneDemo = React.lazy(() => import("./templateLandingConversione/TemplateLandingConversione"));

export const TEMPLATE_LIST: TemplateMeta[] = [
  {
    id: "tpl-facciata-01",
    title: "Sito Facciata Elegante",
    category: "facciata",
    short: "One-page elegante, enfasi su tipografia e ritmo verticale.",
    features: ["SEO base", "Modulo contatti", "Sezione servizi", "Mappa"],
    preview: placeholderSVG("Template • Facciata Elegante"),
    pagesIncluded: ["Home (one-page)", "Servizi", "Chi Siamo", "Contatti"],
    path: "/template/facciata-elegante",
    component: FacciataEleganteDemo,
  },
  {
    id: "tpl-ecommerce-01",
    title: "E-commerce Essenziale",
    category: "ecommerce",
    short: "Catalogo + carrello + checkout — UI chiara e veloce.",
    features: ["Catalogo", "Carrello", "Checkout", "Prodotti correlati"],
    preview: placeholderSVG("Template • E-commerce Essenziale"),
    pagesIncluded: ["Home", "Catalogo", "Scheda Prodotto", "Carrello", "Checkout", "Account"],
    path: "/template/ecommerce-essenziale",
    component: EcommerceEssenzialeDemo,
  },
  {
    id: "tpl-portfolio-01",
    title: "Portfolio Creativo",
    category: "portfolio",
    short: "Griglia responsive con focus su case-study e immagini.",
    features: ["Griglia masonry", "Case-study", "Contatti", "SEO base"],
    preview: placeholderSVG("Template • Portfolio Creativo"),
    pagesIncluded: ["Home", "Portfolio", "Dettaglio Progetto", "Chi Sono", "Contatti"],
    path: "/template/portfolio-creativo",
    component: PortfolioCreativoDemo,
  },
  {
    id: "tpl-landing-01",
    title: "Landing ad Alta Conversione",
    category: "landing",
    short: "Hero forte, social proof e call-to-action evidenti.",
    features: ["Hero", "Testimonianze", "FAQ", "Lead form"],
    preview: placeholderSVG("Template • Landing Conversione"),
    pagesIncluded: ["Landing", "Privacy", "Contatti"],
    path: "/template/landing-conversione",
    component: LandingConversioneDemo,
  },
];
