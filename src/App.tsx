import "./App.css";
import Delimiter from "./components/Delimiter";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Intro from "./components/Intro";
import Form from "./components/Form";
import Input from "./components/Input";
import ContainerCards from "./components/ContainerCards";

const App = () => {
  return (
    <div>
      <Header />
      <Intro />
      <Delimiter>
        <Form />
      </Delimiter>
      <Input />
      <Delimiter>
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
      </Delimiter>
      <Delimiter>
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
      </Delimiter>
      <Delimiter>
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
      </Delimiter>
      <Delimiter>
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
      </Delimiter>
      <Footer />
    </div>
  );
};

export default App;
