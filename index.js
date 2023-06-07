const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT;
const app = express();

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

//middleware
app.use(cors(corsOptions));
app.use(express.json());

// const uri = "mongodb://localhost:27017/";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jxgrj34.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const programCollection = client.db("linguaEaseDB").collection("programs");

app.get("/programs", async (req, res) => {
  const result = await programCollection.find().toArray();
  res.send(result);
});

app.get("/programs/popular", async (req, res) => {
  const result = await programCollection
    .find()
    .sort({ enrolled: -1 })
    .limit(6)
    .toArray();
  res.send(result);
});

app.get("/", (req, res) => {
  res.send({ message: "LinguaEase server is running" });
});

app.listen(port, () => {
  console.log(`LinguaEase server is running on port : ${port}`);
});
