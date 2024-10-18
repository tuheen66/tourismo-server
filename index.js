const express = require("express");
const cors = require("cors");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://tourismo-53356.web.app"],
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1gnzeig.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("tourismo").collection("users");
    const packagesCollection = client.db("tourismo").collection("packages");
    const bookingCollection = client.db("tourismo").collection("bookings");
    const wishlistCollection = client.db("tourismo").collection("wishlists");
    const reviewCollection = client.db("tourismo").collection("reviews");
    const guideProfileCollection = client
      .db("tourismo")
      .collection("guide_profile");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: " forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    app.get("/user", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/tour-guide", async (req, res) => {
      const result = await userCollection.find({ role: "guide" }).toArray();
      res.send(result);
    });

    app.patch("/user/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/guide-request/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          guide_request: "requested",
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.patch("/user/guide/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "guide",
          guide_request: "approved",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // to get user data for booking a tour / to get my profile info

    app.get("/user/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const user = await userCollection.findOne(query);

      let admin = false;

      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/packages", async (req, res) => {
      const result = await packagesCollection.find().toArray();
      res.send(result);
    });

    app.get("/package/:tourType", async (req, res) => {
      const tourType = req.params.tourType;
      const query = { tourType: tourType };
      const result = await packagesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/packages/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await packagesCollection.findOne(query);
      res.send(result);
    });

    app.post("/packages", async (req, res) => {
      const packages = req.body;
      const result = await packagesCollection.insertOne(packages);
      res.send(result);
    });

    app.get("/guide-profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await guideProfileCollection.findOne(query);
      res.send(result);
    });

    app.get("/guides/", async (req, res) => {
      const result = await guideProfileCollection.find().toArray();
      res.send(result);
    });

    app.get("/guides/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await guideProfileCollection.findOne(query);
      res.send(result);
    });

    app.post("/tour-guide-profile", async (req, res) => {
      const profile = req.body;
      const result = await guideProfileCollection.insertOne(profile);
      res.send(result);
    });

    //  bookings

    app.get("/bookings/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/booking/:name", async (req, res) => {
      const name = req.params.name;
      const query = { guide_name: name };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      const result = await bookingCollection.insertOne(bookings);
      res.send(result);
    });

    app.patch("/booking/accept/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Accepted",
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/booking/reject/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Rejected",
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/booking/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    //  wishlist

    app.post("/wishlist", async (req, res) => {
      const wishlist = req.body;
      const query = {
        tripId: wishlist.tripId,
        email: wishlist.email,
      };
      const existingWishlist = await wishlistCollection.findOne(query);
      if (existingWishlist) {
        return res.send({
          message: "Wishlist already added",
          insertedId: null,
        });
      }
      const result = await wishlistCollection.insertOne(wishlist);
      res.send(result);
    });

    app.get("/wishlist/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/wishlist/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    // reviews

    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Tourismo server is running");
});

app.listen(port, () => {
  console.log(`Tourismo server is running on Port :${port}`);
});
