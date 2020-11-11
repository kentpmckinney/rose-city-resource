const keys = require("./config/nodeKeys");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const { Pool } = require('pg');
const app = express();

/* Heroku free postgres allows up to 20 concurrent connections */
const pool = new Pool({
  connectionString: keys.PG_CONNECTION_STRING,
  max: 20,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', async (error, client) => {
  if (process.env.NODE_ENV === undefined || process.env.NODE_ENV !== "production") {
    console.log(`pool.error: ${error}; connection.string: ${keys.PG_CONNECTION_STRING}`);
  }
});

/* Middleware */
app.use(cors());
app.use(helmet())
app.use(helmet.hidePoweredBy({ setTo: 'Blood, Sweat and Tears' }));
app.use(compression());
app.use(express.urlencoded({ extended: false }));

/* Configure view templates, which form the HTML part of the admin and login pages */
app.set("view engine", "ejs");

/* Routes */
require("./routes/query")(app, pool);
require("./routes/query-staging")(app, pool);
require("./routes/last-update")(app, pool);
require("./routes/admin")(app, pool);

/* Check for database connectivity and provide a human-friendly message on failure */
const testDatabaseQuery = () => {
  pool.query(`select last_update from production_meta`, (err, res) => {
    if (err) {
      console.log('Error connnecting to the database!');
      if (process.env.DATABASE_URL === undefined || process.env.DATABASE_URL === null || process.env.DATABASE_URL === '') {
        console.log('Please check that the DATABASE_URL environment variable is correct');
      }
    }
  });
}
testDatabaseQuery();

/* Default handler for requests not handled by one of the above routes */
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT);