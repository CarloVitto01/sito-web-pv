import "./App.css";
import Delimiter from "./components/Delimiter";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Intro from "./components/Intro";
import Form from "./components/Form";

const App = () => {
  return (
    <div>
      <Header />
      <Intro />
      <Delimiter>
        <Form />
      </Delimiter>
      <Delimiter>{/* COMING SOON*/}</Delimiter>
      <Footer />
    </div>
  );
};

export default App;
