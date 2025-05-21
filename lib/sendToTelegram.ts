// src/lib/sendToTelegram.ts

export type ProductRow = {
  name: string;
  brand: string;
  original_price?: string;
  discounted_price: string;
  discount_percent: string;
  rating?: string;
  image_url: string;
  url: string;
  kategori: string;
};

/**
 * Telegram'a fotoğraf URL'si ile gönderim yapar.
 * Her ürün için ayrı try/catch. Gönderim cevabını loglar.
 */
export const sendToTelegramWithImage = async (
  products: ProductRow[],
  botToken: string,
  chatId: string
): Promise<void> => {
  const endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  for (const product of products) {
    if (!product.image_url) {
      console.warn(`Skipping "${product.name}" (no image_url)`);
      continue;
    }

    const caption = `
<b>${product.name}</b>
Brand: ${product.brand}
Original Price: ${product.original_price}
Discounted Price: ${product.discounted_price}
Discount Percent: ${product.discount_percent}
Rating: ${product.rating}
Kategori: ${product.kategori}
URL: ${product.url}
`;

    const payload = {
      chat_id: chatId,
      photo: product.image_url,
      caption,
      parse_mode: "HTML",
    };

    try {
      console.debug("Sending to Telegram:", payload);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Telegram invalid JSON response", text);
        continue;
      }

      if (!response.ok || !data.ok) {
        console.error("Telegram API Error:", data || text);
        continue;
      }

      console.info(
        `Sent "${product.name}" as message_id=${data.result.message_id}`
      );
    } catch (err) {
      console.error(`Error sending "${product.name}":`, err);
      // continue to next product
    }

    // Rate limit önlemi
    await new Promise((r) => setTimeout(r, 500));
  }
};