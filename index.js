import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import "dotenv/config";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

const app = express();
const saltRounds = 5;

const theUser = process.env.DB_USER;
const thePass = process.env.DB_PASSWORD;



if (!theUser || !thePass) {
  console.error("ERROR: Missing env vars.");
}

let pool;

function initializeDB() {
    pool = mysql.createPool({
    host: "srv1293.hstgr.io",
    user: theUser,
    password: thePass,
    database: "u354636099_library",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  });
  console.log("Successfully connected to Hostingers DB");
}

(async () => {
  //Esta es una función autoejecutable  o IIFE: Inmediatly Invoked Function Expression
  try {
    initializeDB(); // <- clave --Espera a inicializar la base de datos
    app.listen(3000, () => console.log("All ok from port 3000")); //Inicializa la aplicación
  } catch (err) {
    //En caso de error
    console.error("Error inicializando la BD:", err); //Nos manda a la consola el error
    process.exit(1);
  }
})();

async function getBooks() {
  const result = await pool.query("SELECT * FROM books");
  const books = result[0];
  console.log(books);
  return books;
}

async function postBook(newBook) {
  const { title, author, isbn, the_year, score, user_resume, personal_notes } =
    newBook;
  const cover_url = `https://covers.openlibrary.org/b/isbn/${isbn.trim()}-M.jpg`;
  const queryText =
    "INSERT INTO books (title, author, isbn, the_year, score, user_resume, personal_notes, cover_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  const queryValues = [
    title,
    author,
    isbn,
    the_year,
    score,
    user_resume,
    personal_notes,
    cover_url,
  ];
  console.log(queryValues)
  try {
    await pool.query(queryText, queryValues);
    console.log("Success!");
  } catch (err) {
    console.log("Error trying to insert data in the DB", err);
    throw err;
  }
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "Ch@rlott31987",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60  * 60
    }
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.render("login.ejs")
})

app.get("/register", (req, res) => {
  res.render("register.ejs")
})

// app.get("/", async (req, res) => {
//   try {
//     const dbBooks = await getBooks();
//     res.render("index.ejs", { books: dbBooks });
//   } catch (err) {
//     console.error("Error al cargar los libros en la página principal:", err);
//     res.status(500).send("Hubo un problema al cargar tu colección de libros.");
//   }
// });

app.post("/register", async (req, res) => {
  const userInputData = req.body;
  console.log(userInputData.email);

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [userInputData.email]) //+Esta deestructuración funciona porque  "rows"
    //+toma el valor del primer elemento del arrreglo del resultado de la query. En este caso el primer elemento son los datos de la búsqueda. El nombre de la const puede ser el que quieras
    if (rows.length === 0) {
      console.log("User not found")
    }   
  }catch (error) {
    res.status(500).json({ 
    mensaje: "Error en el servidor", 
    errorReal: error.message 
  });
  }
}
)


app.get("/addbook", (req, res) => {
    res.render("registerbook.ejs");
});

app.get("/book/:id", async (req, res) => {
  const bookID = req.params.id;
  try {
    console.log(bookID)
    res.render("libro.ejs", {})
  } catch (error) {
    console.error("Error al obtener el libro: ", error);
    res.status(500).send("Error del servidor")
  }
 
})

app.get("/editBook/:id", async (req, res) => {
  const bookID = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM books WHERE id = ?", [bookID])
    const theBook = result[0][0];
    res.render("editBook.ejs", {book: theBook})
  } catch (err) {
     console.error("Error al obtener el libro:", err);
     res.status(500).send("Error interno al intentar recibir el libro.");
  }
})

app.post("/addbook", async (req, res)=> {
    const theBook = req.body;
    theBook.score = parseInt(theBook.score, 10) || 0;
    try {
        await postBook(theBook);
        console.log(theBook);
        res.redirect("/");
    } catch (err) {
         res.status(500).send("Error al procesar el libro.");
    }
})

app.post("/edit/:id", async (req, res) => {
  const bookID = req.params.id;
  const {title, author, isbn, the_year, score, user_resume, personal_notes} = req.body;
  const scoreInt = parseInt(score, 10) || 1;
  const cover_url = `https://covers.openlibrary.org/b/isbn/${isbn.trim()}-M.jpg`;
  const queryValues = [title, author, isbn, the_year, scoreInt, user_resume, personal_notes, cover_url, bookID]
  try {
    await pool.query(
      "UPDATE books SET title = ?, author = ?, isbn = ?, the_year = ?, score = ?, user_resume = ?, personal_notes = ?, cover_url = ? WHERE id = ?", queryValues
    )
    console.log("Success Azpil")
    res.redirect("/")
  } catch (err) {
    console.error("Error al actualizar el libro:", err);
    res.status(500).send("Error interno al intentar editar el libro.");
  }
})

app.delete("/book/:id", async (req, res) => {
  const bookID = req.params.id;
  try {
    await pool.query("DELETE FROM books WHERE id = ?", [bookID]);
    console.log(`Libro con id: ${bookID} ha sido eliminado`);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error al ejecutar la query en MySQL", error);
    res.status(500).send("Error interno del servidor al eliminar el registro");
  }
})

