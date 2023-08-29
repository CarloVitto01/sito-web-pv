import Card from "./Card";
import classes from "./ContainerCards.module.css";

interface propsContainer {
    title: string,
    components: any[]
}

const ContainerCards: React.FC<propsContainer> = ({ title, components }) => {

    return (<> <h1 className={classes["title"]}>{title}</h1>
        <div className={classes["container"]}>

            {components.map(component => <Card title={component.title} imageSrc={component.imageSrc} />)}
        </div></>
    );
};

export default ContainerCards;