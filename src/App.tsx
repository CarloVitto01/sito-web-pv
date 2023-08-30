import "./App.css";
import Delimiter from "./components/Delimiter";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Intro from "./components/Intro";
import Form from "./components/Form";
import Input from "./components/Input";
import ContainerCards from "./components/ContainerCards";
import IntervalloPagine from "./components/IntervalloPagine";
import SingleDelimiter from "./components/SingleDelimiter";

const App = () => {
  return (
    <div>
      <Header />
      <Intro />
      <Delimiter>
        <Form />
      </Delimiter>
      <Input />
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
        />
      <SingleDelimiter/>
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
        />

      <SingleDelimiter/>
        <IntervalloPagine />
      <Footer />
    </div>
  );
};

export default App;
