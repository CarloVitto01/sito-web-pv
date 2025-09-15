import React from "react";
import type { TemplateMeta } from "./types";
import { placeholderSVG } from "./utils";

const FacciataEleganteDemo = React.lazy(() => import("./templateFacciataElegante/TemplateFacciataElegante"));
const EcommerceEssenzialeDemo = React.lazy(() => import("./templateEcommerceEssenziale/TemplateEcommerceEssenziale"));
const PortfolioCreativoDemo = React.lazy(() => import("./templatePortfolioCreativo/TemplatePortfolioCreativo"));
const BlogMagazineDemo = React.lazy(() => import("./templateBlog/TemplateBlogMagazine"));
const CatalogoProdottiDemo = React.lazy(() => import("./templateCatalogoProdotti/TemplateCatalogoProdotti"));
const BookingServiziDemo = React.lazy(() => import("./templateBookingServizi/TemplateBookingServizi"));

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
    id: "tpl-blog-01",
    title: "Blog Magazine",
    category: "blog",
    short: "Articoli, categorie, ricerca e newsletter.",
    features: ["Categorie", "Ricerca", "Newsletter", "SEO"],
    preview: placeholderSVG("Template • Blog Magazine"),
    pagesIncluded: ["Home", "Blog", "Articolo", "Categorie", "Contatti"],
    path: "/template/blog-magazine",
    component: BlogMagazineDemo,
  },
  {
    id: "tpl-catalogo-01",
    title: "Catalogo Prodotti",
    category: "catalogo",
    short: "Vetrina prodotti con richiesta preventivo (senza checkout).",
    features: ["Schede prodotto", "Filtri", "Richiesta preventivo", "SEO"],
    preview: placeholderSVG("Template • Catalogo Prodotti"),
    pagesIncluded: ["Home", "Catalogo", "Scheda Prodotto", "Contatti"],
    path: "/template/catalogo-prodotti",
    component: CatalogoProdottiDemo,
  },
  {
    id: "tpl-booking-01",
    title: "Booking / Prenotazioni",
    category: "booking",
    short: "Calendario, slot e conferme email.",
    features: ["Calendario", "Slot", "Email", "Gestione richieste"],
    preview: placeholderSVG("Template • Booking Servizi"),
    pagesIncluded: ["Home", "Servizi", "Prenota", "Conferma", "Contatti"],
    path: "/template/booking-servizi",
    component: BookingServiziDemo,
  },
  
];
