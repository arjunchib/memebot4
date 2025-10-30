async function* producerGenerator() {
  let i = 1000;
  while (i-- > 0) {
    if (i % 50 === 0) {
      await Bun.sleep(Math.random() * 5000); // get more data
    }
    yield i;
  }
}

const producer = producerGenerator();

async function consumer(id: number) {
  for await (const num of producer) {
    await Bun.sleep(Math.random() * 5000); // do some task
    console.log(`consumer ${id}: ${num}`);
  }
}

await Promise.all([1, 2, 3, 4, 5].map(async (i) => await consumer(i)));
