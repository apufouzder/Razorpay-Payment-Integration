const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
require("dotenv").config();
const PORT = process.env.PORT || 5000;
const Razorpay = require('razorpay');
const crypto = require('crypto');


app.use(cors());
app.use(express.json());


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});


const uri = `mongodb://localhost:27017`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const paymentsCollection = await client.db('razorpayIntegration').collection('payments');

        // ROUTE 1 : Create Order Api Using POST Method http://localhost:5000/api/payment/order
        app.post('/api/payment/order', (req, res) => {
            const { amount } = req.body;

            try {
                const options = {
                    amount: Number(amount * 100),
                    currency: "INR",
                    receipt: crypto.randomBytes(10).toString("hex"),
                }

                razorpayInstance.orders.create(options, (error, order) => {
                    if (error) {
                        console.log(error);
                        return res.status(500).json({ message: "Something Went Wrong!" });
                    }
                    res.status(200).json({ data: order });
                    console.log(order)
                });
            } catch (error) {
                res.status(500).json({ message: "Internal Server Error!" });
                console.log(error);
            }
        })

        // ROUTE 2 : Create Verify Api Using POST Method http://localhost:4000/api/payment/verify
        app.post('/api/payment/verify', async (req, res) => {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
            // console.log("req.body", req.body);
        
            try {
                // Create Sign
                const sign = razorpay_order_id + "|" + razorpay_payment_id;
        
                // Create ExpectedSign
                const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
                    .update(sign.toString())
                    .digest("hex");
        
                // console.log(razorpay_signature === expectedSign);
        
                // Create isAuthentic
                const isAuthentic = expectedSign === razorpay_signature;
        
                // Condition 
                if (isAuthentic) {
                    const payment = {
                        razorpay_order_id,
                        razorpay_payment_id,
                        razorpay_signature
                    };
        
                    // Save Payment 
                    const result = await paymentsCollection.insertOne(payment);
        
                    // Send Message 
                    res.json({
                        message: "Payement Successfully",
                        data: result,
                    });
                }
            } catch (error) {
                res.status(500).json({ message: "Internal Server Error!" });
                console.log(error);
            }
        })




        
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send("Welcome Razorpay Payment Integration Server!");
})

app.listen(PORT, (req, res) => {
    console.log(`Server is running at port ${PORT}`);
})
