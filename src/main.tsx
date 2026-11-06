import ReactDOM from "react-dom/client";
import "./index.css";
import { boot } from "./controller";
import { Note } from "./Note";
import { Manage } from "./Manage";
import { Settings } from "./Settings";
import { Panel } from "./Panel";

const [, route, arg] = location.hash.split("/");
if (route === "note") ReactDOM.createRoot(document.getElementById("root")!).render(<Note id={Number(arg)} />);
else if (route === "manage") ReactDOM.createRoot(document.getElementById("root")!).render(<Manage />);
else if (route === "panel") ReactDOM.createRoot(document.getElementById("root")!).render(<Panel id={Number(arg)} kind={location.hash.split("/")[3] as "color" | "size" | "bg"} />);
else if (route === "settings") ReactDOM.createRoot(document.getElementById("root")!).render(<Settings />);
else boot(); // ventana main oculta; sin React para no duplicar el icono de bandeja
