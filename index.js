const fs = require('fs');
const axios = require('axios');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');
const cron = require('node-cron');

class WildBerriesParser {
    constructor() {
        this.telegramToken = process.env.TELEGRAM_TOKEN; // 🔁 замени на свой токен
        this.telegramChatId = process.env.TELEGRAM_CHAT_ID; // 🔁 замени на ID чата или группы

        this.diffProcent = 0.5;

        // Расширенный список User-Agent
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 10; SM-A505FN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.70 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_7_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; ARM64; rv:109.0) Gecko/20100101 Firefox/109.0',
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
            'Mozilla/5.0 (Linux; Android 9; SM-J600FN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:102.0) Gecko/20100101 Firefox/102.0',
            'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:108.0) Gecko/20100101 Firefox/108.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:116.0) Gecko/20100101 Firefox/116.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 11; Redmi Note 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.199 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.199 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.2210.91',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 8.1.0; Nexus 6P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.74 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:114.0) Gecko/20100101 Firefox/114.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
            'Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.224 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:97.0) Gecko/20100101 Firefox/97.0',
            'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5790.170 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 11; SM-M127F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:113.0) Gecko/20100101 Firefox/113.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.200 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 9; Mi A3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.89 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Brave/121.1.60.104 Chrome/121.0.6167.161 Safari/537.36',
            'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15',
            'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux i686; rv:88.0) Gecko/20100101 Firefox/88.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.129 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 11; moto g(100)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.224 Mobile Safari/537.36',
        ];

        this.currentUserAgentIndex = 0;
        this.requestDelay = 2500; // Базовая задержка
        this.maxRetries = 5; // Увеличенное количество попыток
        this.failedRequests = 0; // Счетчик неудачных запросов
        this.directory = __dirname;

        this.db = new sqlite3.Database(path.join(this.directory, 'wildberries.db'), (err) => {
            if (err) {
                console.error('Ошибка при открытии базы данных:', err.message);
            } else {
                console.log('Подключение к базе данных SQLite успешно');
            }
        });
        this.initDatabase();
    }

    initDatabase() {
        const createTableQuery = `CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            link TEXT,
            article INTEGER,
            name TEXT,
            brand TEXT,
            brand_id INTEGER,
            price INTEGER,
            discount_price INTEGER,
            rating INTEGER,
            reviews INTEGER
        )`;
        this.db.run(createTableQuery);
    }

    getRandomDelay(min = 1500, max = 4000) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getNextUserAgent() {
        this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
        return this.userAgents[this.currentUserAgentIndex];
    }

    getHeaders() {
        return {
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'User-Agent': this.getNextUserAgent(),
            Referer: 'https://www.wildberries.ru/',
            Origin: 'https://www.wildberries.ru',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
        };
    }

    async makeRequest(url, retryCount = 0) {
        try {
            const response = await axios.get(url, {
                headers: this.getHeaders(),
                timeout: 8000,
            });

            // Сброс счетчика при успешном запросе
            this.failedRequests = 0;

            // Адаптивная задержка при 429
            if (response.status === 429) {
                this.requestDelay = Math.min(this.requestDelay + 1000, 10000); // Макс 10 сек
                console.warn(`[429] Увеличиваю задержку до ${this.requestDelay}мс`);
                throw new Error('Too Many Requests');
            }

            // Случайная задержка между запросами
            //const delay = this.getRandomDelay();
            //await new Promise((resolve) => setTimeout(resolve, delay));

            return response.data;
        } catch (error) {
            if (error.response.status === 404) {
                return null;
            }
            this.failedRequests++;

            // Аварийное увеличение задержки при нескольких ошибках подряд
            if (this.failedRequests >= 3) {
                this.requestDelay = Math.min(this.requestDelay + 2000, 15000);
                console.warn(`Много ошибок! Новая задержка: ${this.requestDelay}мс`);
            }

            if (retryCount < this.maxRetries) {
                const retryDelay = this.requestDelay * (retryCount + 1);
                console.log(`[Повтор ${retryCount + 1}] Через ${retryDelay}мс...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                return this.makeRequest(url, retryCount + 1);
            }

            console.error(`Запрос провален после ${this.maxRetries} попыток: ${error.message}`);
            return null;
        }
    }

    async downloadCurrentCatalogue() {
        const localCataloguePath = path.join(this.directory, 'wb_catalogue.json');
        if (
            !fs.existsSync(localCataloguePath) ||
            moment(fs.statSync(localCataloguePath).mtime).isBefore(moment(), 'day')
        ) {
            const url = 'https://static-basket-01.wb.ru/vol0/data/main-menu-ru-ru-v2.json';
            const data = await this.makeRequest(url);
            if (data) {
                fs.writeFileSync(localCataloguePath, JSON.stringify(data, null, 2), 'utf-8');
            }
        }
        return localCataloguePath;
    }

    traverseJson(parentCategory, flattenedCatalogue) {
        for (const category of parentCategory) {
            if (category.name && category.url && category.shard && category.query) {
                flattenedCatalogue.push({
                    name: category.name,
                    url: category.url,
                    shard: category.shard,
                    query: category.query,
                });
            }
            if (category.childs) {
                this.traverseJson(category.childs, flattenedCatalogue);
            }
        }
    }

    processCatalogue(localCataloguePath) {
        const catalogue = [];
        const rawData = JSON.parse(fs.readFileSync(localCataloguePath, 'utf-8'));
        this.traverseJson(rawData, catalogue);
        return catalogue;
    }

    async getProductsOnPage(pageData) {
        if (!pageData || !pageData.products) return [];
        return pageData.products.map((item) => ({
            link: `https://www.wildberries.ru/catalog/${item.id}/detail.aspx`,
            article: item.id,
            name: item.name,
            brand: item.brand,
            brand_id: item.brandId,
            price: Math.round(item.priceU / 100),
            discount_price: Math.round(item.salePriceU / 100),
            rating: item.rating,
            reviews: item.feedbacks,
        }));
    }

    saveToDatabase(products) {
        return new Promise((resolve, reject) => {
            const insertQuery =
                'INSERT INTO products (link, article, name, brand, brand_id, price, discount_price, rating, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                const stmt = this.db.prepare(insertQuery);

                for (const product of products) {
                    stmt.run(
                        product.link,
                        product.article,
                        product.name,
                        product.brand,
                        product.brand_id,
                        product.price,
                        product.discount_price,
                        product.rating,
                        product.reviews,
                        (err) => {
                            if (err) {
                                console.error(
                                    `❌ Ошибка вставки товара ${product.article}: ${err.message}`,
                                );
                            }
                        },
                    );
                }

                stmt.finalize((err) => {
                    if (err) {
                        console.error('❌ Ошибка в finalize:', err.message);
                        return reject(err);
                    }

                    this.db.run('COMMIT', (commitErr) => {
                        if (commitErr) {
                            console.error('❌ Ошибка при COMMIT:', commitErr.message);
                            return reject(commitErr);
                        }

                        console.log('✅ Все товары вставлены и COMMIT выполнен');
                        resolve();
                    });
                });
            });
        });
    }

    async getAllProductsInCategory(categoryData) {
        const collected = [];

        for (let page = 1; page < 2; page++) {
            console.log(`Парсинг страницы ${page}...`);
            const url = `https://catalog.wb.ru/catalog/${categoryData.shard}/catalog?appType=1&${categoryData.query}&curr=rub&dest=-1257786&page=${page}&sort=popular&spp=24`;

            const pageData = await this.makeRequest(url);
            if (pageData && pageData.data && pageData.data.products) {
                const products = await this.getProductsOnPage(pageData.data);
                collected.push(...products);
            }

            //const delay = Math.min(this.requestDelay + page * 100, 8000);
            //await new Promise((resolve) => setTimeout(resolve, delay));
        }

        return collected;
    }

    async getOldProductsFromDB() {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM products';
            this.db.all(query, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    compareProducts(oldProducts, newProducts) {
        const changed = [];

        const oldMap = new Map();
        for (const oldProduct of oldProducts) {
            oldMap.set(oldProduct.article, oldProduct);
        }

        for (const newProduct of newProducts) {
            const oldProduct = oldMap.get(newProduct.article);
            if (!oldProduct) continue;

            const diffPrice =
                newProduct.discount_price <= oldProduct.discount_price * this.diffProcent;

            if (diffPrice) {
                changed.push({
                    oldProduct: oldProduct,
                    newProduct: newProduct,
                });
            }
        }

        return changed;
    }

    clearOldProductsFromDB() {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM products', [], function (err) {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    async runParser() {
        try {
            const startTime = Date.now();
            const localCataloguePath = await this.downloadCurrentCatalogue();
            const processedCatalogue = this.processCatalogue(localCataloguePath);

            console.log(`Начинаю парсинг всех категорий (${processedCatalogue.length})...`);

            const allNewProducts = [];

            for (const categoryData of processedCatalogue) {
                console.log(`Парсинг категории: ${categoryData.name}`);
                const products = await this.getAllProductsInCategory(categoryData);
                allNewProducts.push(...products);
            }

            const oldProducts = await this.getOldProductsFromDB();
            const changedProducts = this.compareProducts(oldProducts, allNewProducts);

            if (changedProducts.length > 0) {
                console.log(`Обнаружено изменений: ${changedProducts.length}`);
                // Тут отправка в Telegram
                await this.sendToTelegram(changedProducts);
            }

            await this.clearOldProductsFromDB();
            await this.saveToDatabase(allNewProducts);

            const totalTime = ((Date.now() - startTime) / (1000 * 60)).toFixed(2);
            fs.appendFileSync('parsing_time.log', `Парсинг завершён за ${totalTime} минут\n`);

            console.log('Готово! Данные обновлены.');
        } catch (error) {
            console.error(`Фатальная ошибка: ${error.message}`);
        } finally {
            this.db.close();
            process.exit();
        }
    }

    getReviewSuffix(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'ов';
        if (lastDigit === 1) return '';
        if (lastDigit >= 2 && lastDigit <= 4) return 'а';
        return 'ов';
    }

    async sendToTelegram(changedProducts) {
        const token = this.telegramToken;
        const chatId = this.telegramChatId;
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const uniqueProducts = new Map();
        for (const pair of changedProducts) {
            const article = pair.newProduct.article;
            if (!uniqueProducts.has(article)) {
                uniqueProducts.set(article, pair);
            }
        }

        const productMessages = [];
        const separator = '\n---\n';

        for (const { oldProduct, newProduct } of uniqueProducts.values()) {
            const priceDropPercent =
                ((oldProduct.discount_price - newProduct.discount_price) /
                    oldProduct.discount_price) *
                100;

            const productMessage = `
**🛍 ${newProduct.name}**  
🆔 Артикул: \`${newProduct.article}\`  
⭐️ Рейтинг: **${newProduct.rating}** (${newProduct.reviews} отзыв${this.getReviewSuffix(newProduct.reviews)})  
💸 **Скидка: −${priceDropPercent.toFixed(0)}%**\n~~${oldProduct.discount_price}₽~~ → **${newProduct.discount_price}₽**
🔗 [Открыть на Wildberries](${oldProduct.link})

---`;
            productMessages.push(productMessage);
        }

        const maxMessageLength = 3800; // максимальная длина сообщения
        let messageParts = [];
        let currentMessage = '';

        for (const part of productMessages) {
            // +separator.length чтобы учитывать разделитель между товарами
            if ((currentMessage + separator + part).length > maxMessageLength) {
                messageParts.push(currentMessage.trim());
                currentMessage = part;
            } else {
                currentMessage += (currentMessage ? separator : '') + part;
            }
        }

        // Добавляем последний блок
        if (currentMessage) {
            messageParts.push(currentMessage.trim());
        }

        // Отправляем каждую часть
        try {
            for (let i = 0; i < messageParts.length; i++) {
                await axios.post(url, {
                    chat_id: chatId,
                    text: messageParts[i],
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                });
            }

            console.log('Сообщения отправлены в Telegram.');
        } catch (err) {
            console.error(`Ошибка при отправке в Telegram: ${err.message}`);
        }
    }
}

const task = cron.schedule(
    '0 * * * *',
    async () => {
        console.log('Запуск парсера по крону:', new Date().toISOString());
        const parser = new WildBerriesParser();
        try {
            await parser.runParser();
        } catch (e) {
            console.error(e);
        }
    },
    {
        scheduled: true, // по умолчанию, но можно указать явно
    },
);

// (async () => {
//     console.log('Первый запуск парсера:', new Date().toISOString());
//     const parser = new WildBerriesParser();
//     await parser.runParser();
// })();

task.start();
