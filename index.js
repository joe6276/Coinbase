const express = require("express")
const dotenv = require("dotenv")
const axios = require("axios")
const coinbase = require("coinbase-commerce-node")
const cors = require("cors")
const { sendMail } = require("./Email")

dotenv.config()


const app = express()

app.use(express.json({
    verify: (req, res, buf) => {
        const url = req.originalUrl;
        if (url.startsWith("/webhook")) {
            req.rawBody = buf.toString()
        }
    }
}))

app.use(cors())

const Client = coinbase.Client
const resources = coinbase.resources
const webhook = coinbase.Webhook


Client.init(process.env.COINBASE_API_KEY)

app.post("/checkout", async (req, res) => {
  
    
    const { amount, currency, companyId, redirect_url, cancel_url } = req.body

    const response = await axios.post("https://docstant-cnhrfqh8fnajc6gj.canadacentral-01.azurewebsites.net/api/Coinbase",

        {
            "amount": amount,
            "currency": currency,
            "companyId":companyId
        }
    );

   const id =response.data.toString();


    try {

        const charge = await resources.Charge.create({
            name: "Test Charge",
            description: "Test Description",
            local_price: {
                amount: amount,
                currency: currency
            },
            pricing_type: 'fixed_price',
            metadata: {
                user_id: id
            },
            redirect_url: redirect_url,
            cancel_url: cancel_url
        })

        res.status(200).json({
            charge: charge
        })
    } catch (error) {
        res.status(500).json({
            error: error
        })
    }
})


app.get("/test", (req,res)=>{
    return res.status(200).send("<h1> Hello there !</h1>")
})

app.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    try {

        const event = webhook.verifyEventBody(
            req.rawBody,
            req.headers["x-cc-webhook-signature"],
            process.env.COINBASE_WEBHOOK_SECRET
        )

        if (event.type == "charge:confirmed") {

            let amount = event.data.pricing.local.amount
            let currency = event.data.pricing.local.currency
            let userId = event.data.metadata.user_id ? event.data.metadata.user_id  :'18'

            console.log(amount, currency, userId);


       const response= await axios.put(`https://docstant-cnhrfqh8fnajc6gj.canadacentral-01.azurewebsites.net/api/Coinbase/${userId}`);
        
    //    console.log(response);
       
    

        res.sendStatus(200)
        }
    } catch (error) {
        res.status(500).json(error)

        await sendMail(
           ` <p>
                ${error}
            </p>`
        )

    }
})


app.listen(process.env.PORT, () => {
    console.log("Server is Running on "+process.env.PORT);

})
