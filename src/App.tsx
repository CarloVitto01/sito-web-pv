import "./App.css";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Intro from "./components/Intro";
import Form from "./components/Form";
import Input from "./components/Input";
import ContainerCards from "./components/ContainerCards";
import IntervalloPagine from "./components/IntervalloPagine";
import SingleDelimiter from "./components/SingleDelimiter";
import NumeroCopie from "./components/NumeroCopie";
import Modal from "./components/Modal";
import { useState, useEffect } from "react";

const foglio = 0.019;
const biancoNero: number = 0.009;
const colore: number = 0.028;
const anelli = 1.5;
const fascetta = 1;
const ciappatura = 0.1;

const inchiostroEnum = {
  BIANCOENERO: 0,
  COLORE: 1,
};

const paginaEnum = {
  FRONTE_RETRO: 0,
  FRONTE: 1,
};

const layoutEnum = {
  VERTICALE: 0,
  ORIZZONTALE: 1,
  DUEPAGORIZZ: 2,
  DUEPAGVERT: 3,
};

const rilegaturaEnum = {
  ANELLI: 0,
  FASCETTA: 1,
  CIAPPATURA: 2,
  NESSUNA: 3,
};

const App = () => {
  const [inchiostro, setInchiostro] = useState<number>(
    inchiostroEnum.BIANCOENERO
  );
  const [pagina, setPagina] = useState<number>(paginaEnum.FRONTE_RETRO);
  const [layout, setLayout] = useState<number>(layoutEnum.VERTICALE);
  const [rilegatura, setRilegatura] = useState<number>(rilegaturaEnum.ANELLI);
  const [intervalloPagine, setIntervalloPagine] = useState<number>(1);
  const [numerPaginePDF, setNumeroPaginePDF] = useState<number>(0);
  const [numeroCopie, setNumeroCopie] = useState<number>(1);
  const [preventivo, setPreventivo] = useState<string>("0.00");

  //Debug
  // console.log(numerPaginePDF);
  // console.log(inchiostro);
  // console.log(pagina);
  // console.log(layout);
  // console.log(rilegatura);
  // console.log(intervalloPagine);
  // console.log(numeroCopie);
  //

  const newValue = (value: string) => {
    switch (value) {
      case "Bianco e nero":
        setInchiostro(inchiostroEnum.BIANCOENERO);
        break;
      case "Colore":
        setInchiostro(inchiostroEnum.COLORE);
        break;
      case "Fronte-retro":
        setPagina(paginaEnum.FRONTE_RETRO);
        break;
      case "Fronte":
        setPagina(paginaEnum.FRONTE);
        break;
      case "Verticale":
        setLayout(layoutEnum.VERTICALE);
        break;
      case "Orizzontale":
        setLayout(layoutEnum.ORIZZONTALE);
        break;
      case "2 pagine in 1 orizzontale":
        setLayout(layoutEnum.DUEPAGORIZZ);
        break;
      case "2 pagine in 1 verticale":
        setLayout(layoutEnum.DUEPAGVERT);
        break;
      case "Anelli":
        setRilegatura(rilegaturaEnum.ANELLI);
        break;
      case "Fascetta":
        setRilegatura(rilegaturaEnum.FASCETTA);
        break;
      case "Ciappatura":
        setRilegatura(rilegaturaEnum.CIAPPATURA);
        break;
      case "Nessuna":
        setRilegatura(rilegaturaEnum.NESSUNA);
        break;
    }
  };

  const setPagesHandler = (value: number) => {
    setNumeroPaginePDF(value);
  };

  const setRangePagesHandler = (value: any) => {
    if (value.all) {
      if (numerPaginePDF) {
        setIntervalloPagine(numerPaginePDF);
      } else {
        setIntervalloPagine(1);
      }
    } else {
      let from = value.from;
      let to = value.to;
      if (isNaN(from) || isNaN(to)) {
        return;
      }
      let range = to - from + 1;
      if (from === 0 && to === 0) {
        range = 0;
      }
      setIntervalloPagine(range);
    }
  };

  const setCopiesHandler = (value: number) => {
    setNumeroCopie(value);
  };

  useEffect(() => {
    const calcoloPreventivo = () => {
      let totale = 0;
      let fogli = intervalloPagine;
      let prezzoInchiostro =
        inchiostro === inchiostroEnum.BIANCOENERO ? biancoNero : colore;
      if (pagina === paginaEnum.FRONTE_RETRO) {
        fogli = intervalloPagine;
        totale += foglio + 2 * prezzoInchiostro;
      } else {
        totale += foglio + prezzoInchiostro;
      }

      if (
        layout === layoutEnum.DUEPAGORIZZ ||
        layout === layoutEnum.DUEPAGVERT
      ) {
        totale = 0.5 * totale;
      }

      totale = totale * fogli * numeroCopie;

      if (rilegatura === rilegaturaEnum.ANELLI) {
        totale += anelli * numeroCopie;
      } else if (rilegatura === rilegaturaEnum.FASCETTA) {
        totale += fascetta * numeroCopie;
      } else if (rilegatura === rilegaturaEnum.CIAPPATURA) {
        totale += ciappatura * numeroCopie;
      }
      if(numeroCopie === 0){
        totale = 0;
      }
      return totale.toFixed(2);
    };
    if (numerPaginePDF > 0) {
      let total = calcoloPreventivo();
      setPreventivo(total);
    }
  }, [
    inchiostro,
    pagina,
    layout,
    rilegatura,
    intervalloPagine,
    numerPaginePDF,
    numeroCopie,
  ]);

  return (
    <div className="container">
      <Header />
      <body>
        <Intro />
        <SingleDelimiter />
        <Form />
        <SingleDelimiter />
        <Input onSendData={setPagesHandler} />
        <SingleDelimiter />
        <ContainerCards
          title="Colore:"
          components={[
            {
              title: "Bianco e nero",
              imageSrc: require("./assets/Bianco_e_nero.jpg"),
            },
            { title: "Colore", imageSrc: require("./assets/Colore.jpg") },
          ]}
          defaultValue="Bianco e nero"
          onSendData={newValue}
        />
        <SingleDelimiter />
        <ContainerCards
          title="Gestione pagina:"
          components={[
            {
              title: "Fronte-retro",
              imageSrc: require("./assets/Fronte_retro.png"),
            },
            { title: "Fronte", imageSrc: require("./assets/Fronte.png") },
          ]}
          defaultValue="Fronte-retro"
          onSendData={newValue}
        />
        <SingleDelimiter />
        <ContainerCards
          title="Layout:"
          components={[
            { title: "Verticale", imageSrc: require("./assets/Verticale.jpg") },
            {
              title: "Orizzontale",
              imageSrc: require("./assets/Orizzontale.jpg"),
            },
            {
              title: "2 pagine in 1 orizzontale",
              imageSrc: require("./assets/2in1Orizzontale.jpg"),
            },
            {
              title: "2 pagine in 1 verticale",
              imageSrc: require("./assets/2in1Verticale.jpg"),
            },
          ]}
          defaultValue="Verticale"
          onSendData={newValue}
        />
        <SingleDelimiter />
        <ContainerCards
          title="Rilegatura:"
          components={[
            { title: "Anelli", imageSrc: require("./assets/Anelli.jpg") },
            { title: "Fascetta", imageSrc: require("./assets/Fascetta.jpg") },
            {
              title: "Ciappatura",
              imageSrc: require("./assets/Ciappatura.jpg"),
            },
            { title: "Nessuna", imageSrc: require("./assets/Nessuna.jpg") },
          ]}
          defaultValue="Anelli"
          onSendData={newValue}
        />

        <SingleDelimiter />
        <IntervalloPagine onSendData={setRangePagesHandler} />
        <SingleDelimiter />
        <NumeroCopie onSendData={setCopiesHandler} />
        <SingleDelimiter />
        <Modal totalOrder={preventivo} />
      </body>
      <Footer />
    </div>
  );
};

export default App;
