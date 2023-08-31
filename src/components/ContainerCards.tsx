import Card from "./Card";
import classes from "./ContainerCards.module.css";

interface propsContainer {
    title: string,
    components: any[]
}

const ContainerCards: React.FC<propsContainer> = ({ title, components }) => {

    return (
        <div className={classes["container-cards"]}>
            <h1 className={classes["title"]}>{title}</h1>
            <div className={classes["container"]}>
                {components.map(component => <Card key={Math.round(Math.random() * 1000)} title={component.title} imageSrc={component.imageSrc} />)}
            </div>
        </div>
    );
};

export default ContainerCards;