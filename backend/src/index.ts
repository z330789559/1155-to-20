import express from 'express';
import { QuoteAggregatorService } from './services/quoteAggregator.js';
import { z } from 'zod';

const app = express();
app.use(express.json());

const quoteSchema = z.object({
  chain: z.string(),
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.string(),
  slippageBps: z.number().min(0).max(5000).default(50),
});

const aggregator = new QuoteAggregatorService();

app.post('/quote', async (req, res) => {
  try {
    const payload = quoteSchema.parse(req.body);
    const quote = await aggregator.quote({ ...payload, amountIn: payload.amountIn });
    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Quote aggregator listening on ${process.env.PORT || 3000}`);
});
