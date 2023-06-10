const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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

const userCollection = client.db("linguaEaseDB").collection("users");
const programCollection = client.db("linguaEaseDB").collection("programs");
const instructorCollection = client
  .db("linguaEaseDB")
  .collection("instructors");
const selectedProgramCollection = client
  .db("linguaEaseDB")
  .collection("selectedPrograms");

// jwt routes
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res.send({ token });
});

// user routes
app.get("/users", async (req, res) => {
  const email = req.params.email;
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.get("/users/role/:email", async (req, res) => {
  const email = req.params.email;
  const result = await userCollection.findOne({ email: email });
  const role = result?.role || "none";
  console.log(role);
  res.send(role);
});

app.post("/users", async (req, res) => {
  const user = req.body;
  const email = user.email;
  const alreadyExists = await userCollection.findOne({ email: email });
  if (alreadyExists) {
    return res.send({ message: "User Already Exists" });
  }

  user.role = "student";
  const result = await userCollection.insertOne(user);
  res.send(result);
});

// programs routes
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

// instructors routes
app.get("/instructors", async (req, res) => {
  const result = await instructorCollection.find().toArray();
  res.send(result);
});

app.get("/instructors/popular", async (req, res) => {
  const programs = await programCollection.find().toArray();
  const instructors = await instructorCollection.find().toArray();

  // Sort instructors based on the number of enrolled students
  instructors.sort((a, b) => {
    const instructorA = programs.find(
      (program) => program.instructor_email === a.email
    );
    const instructorB = programs.find(
      (program) => program.instructor_email === b.email
    );
    return instructorB.enrolled - instructorA.enrolled;
  });

  res.json(instructors.slice(0, 6));
});

app.get("/", (req, res) => {
  res.send({ message: "LinguaEase server is running" });
});

app.listen(port, () => {
  console.log(`LinguaEase server is running on port : ${port}`);
});
