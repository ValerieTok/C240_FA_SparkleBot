const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const indexRoutes = require("./routes/indexRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/upload", uploadRoutes);
app.use("/", indexRoutes);

app.use((req, res) => {
  res.status(404).render("layout", {
    title: "Page Not Found",
    currentPage: "not-found",
    page: {
      heading: "Page not found",
      description: "The page you requested does not exist."
    },
    body: "pages/not-found"
  });
});

app.listen(PORT, () => {
  console.log(`SparkleBot is running at http://localhost:${PORT}`);
});
