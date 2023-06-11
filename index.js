const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
const paymentCollection = client.db("linguaEaseDB").collection("payments");

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
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.get("/users/role/:email", async (req, res) => {
  const email = req.params.email;
  const result = await userCollection.findOne({ email: email });
  const role = result?.role || "none";
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

app.patch("/users/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateRole = {
    $set: {
      role: req?.body?.role,
    },
  };
  const result = await userCollection.updateOne(filter, updateRole);
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

app.get("/programs/program/:id", async (req, res) => {
  const id = req.params.id;
  const result = await programCollection
    .find({ _id: new ObjectId(id) })
    .toArray();
  res.send(result);
});

app.get("/programs/:email", async (req, res) => {
  const email = req.params.email;
  const result = await programCollection
    .find({ instructor_email: email })
    .toArray();
  res.send(result);
});

app.post("/programs", async (req, res) => {
  const newProgram = req.body;
  newProgram.enrolled = 0;
  newProgram.status = "pending";
  newProgram.feedback = "N/A";

  const result = await programCollection.insertOne(newProgram);
  res.send(result);
});

app.patch("/programs/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateStatus = {
    $set: {
      status: req?.body?.status,
    },
  };
  const result = await programCollection.updateOne(filter, updateStatus);
  res.send(result);
});

app.patch("/programs/feedback/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateFeedback = {
    $set: {
      feedback: req?.body?.feedback,
    },
  };
  const result = await programCollection.updateOne(filter, updateFeedback);
  res.send(result);
});

// instructors routes
app.get("/instructors", async (req, res) => {
  const result = await instructorCollection.find().toArray();
  res.send(result);
});

// app.get("/instructors/popular", async (req, res) => {
//   const programs = await programCollection.find().toArray();
//   const instructors = await instructorCollection.find().toArray();

//   //  Sort instructors based on the number of enrolled students
//   instructors.sort((a, b) => {
//     const instructorA = programs.find(
//       (program) => program.instructor_email === a.email
//     );
//     const instructorB = programs.find(
//       (program) => program.instructor_email === b.email
//     );
//     return instructorB.enrolled - instructorA.enrolled;
//   });

//   res.json(instructors.slice(0, 6));
// });

// selected programs routes
app.get("/selected-programs/:email", async (req, res) => {
  const email = req.params.email;

  const programs = await programCollection.find().toArray();
  const items = await selectedProgramCollection
    .find({ email: email })
    .toArray();

  const selectedPrograms = items.map((item) => {
    const program = programs.find(
      (program) => program._id.toString() === item.programId.toString()
    );

    item.program = program;
    return item;
  });
  res.send(selectedPrograms);
});

app.get("/selected-programs/program/:id", async (req, res) => {
  const id = req.params.id;

  const selectedProgram = await selectedProgramCollection.findOne({
    _id: new ObjectId(id),
  });
  const program = await programCollection.findOne({
    _id: new ObjectId(selectedProgram.programId),
  });

  selectedProgram.program = program;
  res.send(selectedProgram);
});

app.post("/selected-programs", async (req, res) => {
  const newSeletedProgram = req.body;
  const alreadyExists = await selectedProgramCollection.findOne({
    $and: [
      { email: newSeletedProgram.email },
      { programId: newSeletedProgram.programId },
    ],
  });
  if (alreadyExists) {
    return res.send({ message: "already exists" });
  }
  const result = await selectedProgramCollection.insertOne(newSeletedProgram);
  res.send(result);
});

app.delete("/selected-programs/:id", async (req, res) => {
  const id = req.params.id;
  const result = await selectedProgramCollection.deleteOne({
    _id: new ObjectId(id),
  });
  res.send(result);
});

// create payment intent
app.post("/create-payment-intent", verifyJWT, async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price) * 100;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.post("/payments", verifyJWT, async (req, res) => {
  const payment = req.body;

  // Increase Enrolled student number in program
  const programId = payment.programId;
  const filter = { _id: new ObjectId(programId) };
  const update = { $inc: { enrolled: 1 } }; // TODO:
  const updateResult = await programCollection.updateOne(filter, update);

  // delete program from selected programs
  selectedProgramId = payment.selectedProgramId;
  delete payment.selectedProgramId;
  const query = { _id: new ObjectId(selectedProgramId) };
  const deleteResult = await selectedProgramCollection.deleteOne(query);

  // insert payement
  const insertResult = await paymentCollection.insertOne(payment);

  res.send({ updateResult, deleteResult, insertResult });
});

// enrolled programs routes
app.get("/enrolled-programs/:email", async (req, res) => {
  const email = req.params.email;

  const programs = await programCollection.find().toArray();
  const items = await paymentCollection.find({ email: email }).toArray();

  const enrolledPrograms = items.map((item) => {
    const program = programs.find(
      (program) => program._id.toString() === item.programId.toString()
    );

    item.program = program;
    return item;
  });
  res.send(enrolledPrograms);
});

// payment history routes
app.get("/payment-history/:email", async (req, res) => {
  const email = req.params.email;

  const programs = await programCollection.find().toArray();
  const payments = await paymentCollection
    .find({ email: email })
    .sort({ date: "desc" })
    .toArray();

  const paymentsHistory = payments.map((payment) => {
    const program = programs.find(
      (program) => program._id.toString() === payment.programId.toString()
    );

    payment.program = program;
    return payment;
  });

  res.send(paymentsHistory);
});

// base route
app.get("/", (req, res) => {
  res.send({ message: "LinguaEase server is running" });
});

app.listen(port, () => {
  console.log(`LinguaEase server is running on port : ${port}`);
});
