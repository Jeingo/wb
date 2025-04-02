const fs = require('fs');
const axios = require('axios');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');

class WildBerriesParser {
    constructor() {
        // Расширенный список User-Agent
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 10; SM-A505FN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
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
            rating REAL,
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
            const delay = this.getRandomDelay();
            await new Promise((resolve) => setTimeout(resolve, delay));

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
        const insertQuery = `INSERT INTO products (link, article, name, brand, brand_id, price, discount_price, rating, reviews)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        this.db.serialize(() => {
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
                );
            }
            stmt.finalize();
        });
    }

    async addDataFromPage(url) {
        try {
            const pageData = await this.makeRequest(url);
            if (!pageData) return true;

            const productsOnPage = await this.getProductsOnPage(pageData.data);
            if (productsOnPage.length > 0) {
                this.saveToDatabase(productsOnPage);
                console.log(`Добавлено ${productsOnPage.length} товаров в базу данных`);
                return false;
            }
            console.log('Товары на странице отсутствуют');
            return true;
        } catch (error) {
            console.error(`Ошибка при обработке страницы: ${error.message}`);
            return true;
        }
    }

    async getAllProductsInCategory(categoryData) {
        for (let page = 1; page <= 100; page++) {
            console.log(`Страница ${page}...`);
            const url = `https://catalog.wb.ru/catalog/${categoryData.shard}/catalog?appType=1&${categoryData.query}&curr=rub&dest=-1257786&page=${page}&sort=popular&spp=24`;

            if (await this.addDataFromPage(url)) {
                console.log('Достигнут конец категории');
                break;
            }

            // Динамическая задержка с прогрессией
            const dynamicDelay = Math.min(this.requestDelay + page * 100, 8000);
            await new Promise((resolve) => setTimeout(resolve, dynamicDelay));
        }
    }

    async runParser() {
        try {
            const startTime = Date.now();
            const localCataloguePath = await this.downloadCurrentCatalogue();
            const processedCatalogue = this.processCatalogue(localCataloguePath);

            console.log(`Начинаю парсинг всех категорий (${processedCatalogue.length})...`);

            process.on('SIGINT', () => {
                const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
                fs.appendFileSync(
                    'parsing_time.log',
                    `Парсинг завершён за ${totalTime} секунд (прерывание)\n`,
                );
                process.exit();
            });

            for (const categoryData of processedCatalogue.slice(0, 2)) {
                console.log(`Парсинг категории: ${categoryData.name}`);
                await this.getAllProductsInCategory(categoryData);
            }

            console.log(`Готово! Данные сохранены в SQLite.`);
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            fs.appendFileSync('parsing_time.log', `Парсинг завершён за ${totalTime} секунд\n`);
        } catch (error) {
            console.error(`Фатальная ошибка: ${error.message}`);
        } finally {
            this.db.close();
            process.exit();
        }
    }
}

(async () => {
    const parser = new WildBerriesParser();
    await parser.runParser();
})();
