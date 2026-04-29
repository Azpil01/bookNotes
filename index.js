import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2/promise"
import "dotenv/config"

const app = express();

const theUser = process.env.DB_USER;
const thePass = process.env.DB_PASSWORD;

if (!theUser || !thePass) {
    console.error("ERROR: Missing env vars.");
}

let connection;

async function initializeDB() {
    connection = await mysql.createConnection({
        host: "srv1293.hstgr.io",
        user: theUser,
        password: thePass,
        database:"u354636099_test1"
    })
    console.log("Successfully connected to Hostingers DB")
}

(async () => { //Esta es una función autoejecutable  o IIFE: Inmediatly Invoked Function Expression
  try {
    await initializeDB(); // <- clave --Espera a inicializar la base de datos
    app.listen(3000, () => console.log("All ok from port 3000")); //Inicializa la aplicación
  } catch (err) { //En caso de error
    console.error("Error inicializando la BD:", err); //Nos manda a la consola el error
    process.exit(1); // <- evita que atienda requests sin BD
  }
})();

async function getBooks() {
    const result = await connection.query("SELECT * FROM books");
    const books = result[0];
    console.log(books);
    return books
}



app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static("public"));

app.get("/", async (req, res) => {
    const dbBooks = await getBooks();
    console.log(dbBooks);
    res.render("index.ejs", {books: dbBooks});
})