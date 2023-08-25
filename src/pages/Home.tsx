import logo_grafica from "../assets/Logo_grafica.jpg";
import Logo_macchina_fotografica from "../assets/Logo_macchina_fotografica.jpg";
import Logo_stampante from "../assets/Logo_stampante.jpg";
import Logo_video from "../assets/Logo_video.jpg";
import Card from "../components/Card";
import Modal from "../components/Modal";

const HomePage = () => {

  return (
    <div className="sfondo">
      <Modal />
      <div className="containerRettangoli">
        <Card
          title="GRAFICA"
          subtitle="Esprimi te stesso con stile."
          img={logo_grafica}
          text="Creiamo il tuo marchio unico: dall'arte dei <b>loghi personalizzati</b>, all'eleganza dei <b>biglietti da visita</b>, fino all'impatto delle <b>locandine</b> su misura.
            </p>"
        />
        <Card
          title="STAMPA"
          subtitle="Trasforma le tue idee in realtà stampata."
          img={Logo_stampante}
          text="Dai vita ai tuoi <b>documenti</b> e <b>foto</b> con qualità nitida. Lascia un'impressione duratura con i nostri <b>biglietti da visita</b> su misura."
        />
        <Card
          title="FOTO"
          subtitle="Impressione instantanea, stile duraturo."
          img={Logo_macchina_fotografica}
          text=" Cattura il tuo lato migliore con i nostri shooting per <b>fototessere</b> o <b>foto ricordo</b>. Immagini perfette per un'identità unica. </p>"
        />
        <Card
          title="VIDEO"
          subtitle="Cattura l'emozione per sempre."
          img={Logo_video}
          text="Preserva i tuoi momenti preziosi in movimento. La magia dei ricordi prende vita nei nostri <b>video</b> fatti ad hoc.</p>"
        />
      </div>
      <div className="chiSiamoRiquadro">
        <div className="chiSiamoTitolo">Chi siamo?</div>
        <div className="chiSiamoDescrizione">
          Benvenuto in Photo and Vision, un'azienda formata da due ragazzi che
          hanno unito le loro passioni per dare vita a un'esperienza unica nel
          campo della grafica, stampe, foto e video.
          <br />
          Fondata da Carlo e Andrea, la nostra azienda è nata dalla voglia di
          trasformare le idee in realtà visive straordinarie.
          <br />
          La nostra missione è semplice ma ambiziosa: soddisfare appieno le
          esigenze dei nostri clienti attraverso soluzioni visive personalizzate
          e di alta qualità.
          <br />
          <br />
          Sappiamo quanto sia importante per te comunicare il tuo messaggio in
          modo efficace e memorabile, ed è proprio qui che entriamo in gioco.
          <br />
          Con anni di esperienza combinata nel settore della grafica e della
          produzione multimediale, siamo pronti ad affrontare qualsiasi sfida tu
          possa presentarci.
          <br />
          Creiamo progetti che non solo rispondono alle tue esigenze, ma che
          anche catturano l'essenza della tua identità o del tuo marchio.
          <br />
          Che tu stia cercando un logo distintivo, materiale promozionale
          accattivante o un video coinvolgente, il nostro team lavora in
          sinergia con te per comprendere appieno le tue idee e trasformarle in
          opere d'arte visive che supereranno le tue aspettative.
          <br />
          <br />
          La qualità è al centro di tutto ciò che facciamo. Utilizziamo le
          ultime tecnologie e software di design per garantire che ogni
          dettaglio sia impeccabile.
          <br />
          Dalla progettazione all'esecuzione, lavoriamo con dedizione per
          offrirti risultati che parlano da soli.
          <br />
          <br />
          E se c'è una cosa che ci spinge costantemente avanti, è il sorriso
          soddisfatto dei nostri clienti quando vedono il loro progetto prendere
          vita.
          <br />
          Non si tratta solo di servizi, ma di relazioni. Vogliamo costruire
          connessioni durature con i nostri clienti, diventando i tuoi partner
          creativi di fiducia.
          <br />
          La tua visione è la nostra priorità e lavoriamo instancabilmente per
          garantire che sia realizzata con cura e precisione.
          <br />
          <br />
          Unisciti a noi in questo viaggio creativo. Photo and Vision è qui per
          trasformare le tue idee in capolavori visivi, superando le aspettative
          e creando risultati che durano nel tempo. Siamo pronti a mettere il
          nostro talento al tuo servizio e a realizzare insieme qualcosa di
          straordinario.
          <br />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
