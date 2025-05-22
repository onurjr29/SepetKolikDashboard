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
 * Telegram'a fotoğraf ile gönderim yapar.
 * Her ürün için ayrı try/catch ve rate-limit gecikmesi içerir.
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

    // Caption oluşturma
    const captionLines: string[] = [];
    captionLines.push(`<b>${product.name}</b>`);
    captionLines.push(`Brand: ${product.brand}`);
    if (product.original_price) {
      captionLines.push(`Original Price: ${product.original_price}`);
    }
    captionLines.push(`Discounted Price: ${product.discounted_price}`);
    captionLines.push(`Discount Percent: ${product.discount_percent}%`);
    if (product.rating) {
      captionLines.push(`Rating: ${product.rating}`);
    }
    captionLines.push(`Kategori: ${product.kategori}`);
    captionLines.push(`URL: ${product.url}`);
    const caption = captionLines.join("\n");

    const payload = {
      chat_id: chatId,
      photo: product.image_url,
      caption,
      parse_mode: "HTML",
    };

    try {
      console.debug("Sending photo to Telegram", product.name);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        console.error(
          `Telegram API Error for "${product.name}":`,
          data.description || data
        );
        continue;
      }

      console.info(
        `Sent "${product.name}" message_id=${data.result.message_id}`
      );
    } catch (err) {
      console.error(`Error sending "${product.name}":`, err);
      // Hata durumunda devam et
    }

    // Rate-limit önlemi (500ms)
    await new Promise((r) => setTimeout(r, 500));
  }
};
