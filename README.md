# Diamond Hands Portfolio 💎

Parses xlsx report file from XTB platform and draws a chart of portfolio value,
cash and profit over time, with comparison to S&P 500 index.
Presents assets breakdown with potential profits if positions were never closed.

It's just a playground to see what's possible with public yahoo API (historical stock prices, split events).

### Third party APIs
📈 query1.finance.yahoo.com for fetching historical stock prices and split events.\
💱 Currency Exchange API for fetching historical currency exchange rates.\
📇 Redis Cloud for caching stock prices and exchange rates, updated daily.\
📇 Appwrite for storing users' stock events data.\
🔑 Clerk for authentication

### Key features
✅ Track portfolio value, accumulated profit, cash balance\
✅ Compare performance with established indexes, like S&P 500 or NASDAQ\
✅ Analyze profits with Simple-Return, Time-Weighted-Return and Money-Weighted-Return metrics\
✅ Upload new report - data will be merged accordingly\
✅ See an overview of all owned assets, with a breakdown of their performance and allocation\
✅ Look into open or close position events on a specific assets in a historical context

![Performance](performance.png)
![Assets](assets.png)
![AssetsAllocation](assets_allocation.png)
![Asset](asset.png)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
