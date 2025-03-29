const fs = require('fs');
const axios = require('axios');
const path = require('path');
const xlsx = require('xlsx');
const moment = require('moment');

class WildBerriesParser {
    constructor() {
        this.headers = {
            'Accept': '*/*',
            'User-Agent': 'Chrome/51.0.2704.103 Safari/537.36'
        };
        this.runDate = moment().format('YYYY-MM-DD');
        this.productCards = [];
        this.directory = __dirname;
    }

    async downloadCurrentCatalogue() {
        const localCataloguePath = path.join(this.directory, 'wb_catalogue.json');
        if (!fs.existsSync(localCataloguePath) ||
            moment(fs.statSync(localCataloguePath).mtime).isBefore(moment(), 'day')) {
            const url = 'https://static-basket-01.wb.ru/vol0/data/main-menu-ru-ru-v2.json';
            const response = await axios.get(url, { headers: this.headers });
            fs.writeFileSync(localCataloguePath, JSON.stringify(response.data, null, 2), 'utf-8');
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
                    query: category.query
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

    extractCategoryData(catalogue, userInput) {
        return catalogue.find(category =>
            userInput.includes(category.url) || userInput === category.name
        );
    }

    async getProductsOnPage(pageData) {
        return pageData.data.products.map(item => ({
            'Ссылка': `https://www.wildberries.ru/catalog/${item.id}/detail.aspx`,
            'Артикул': item.id,
            'Наименование': item.name,
            'Бренд': item.brand,
            'ID бренда': item.brandId,
            'Цена': Math.round(item.priceU / 100),
            'Цена со скидкой': Math.round(item.salePriceU / 100),
            'Рейтинг': item.rating,
            'Отзывы': item.feedbacks
        }));
    }

    async addDataFromPage(url) {
        try {
            const response = await axios.get(url, { headers: this.headers });
            if (response.status !== 200) return true;
            const productsOnPage = await this.getProductsOnPage(response.data);
            if (productsOnPage.length > 0) {
                this.productCards.push(...productsOnPage);
                console.log(`Добавлено товаров: ${productsOnPage.length}`);
            } else {
                console.log('Загрузка товаров завершена');
                return true;
            }
        } catch (error) {
            console.error(`Ошибка запроса: ${error.message}`);
            return true;
        }
    }

    async getAllProductsInCategory(categoryData) {
        for (let page = 1; page <= 100; page++) {
            console.log(`Загружаю товары со страницы ${page}`);
            const url = `https://catalog.wb.ru/catalog/${categoryData.shard}/catalog?appType=1&${categoryData.query}&curr=rub&dest=-1257786&page=${page}&sort=popular&spp=24`;
            if (await this.addDataFromPage(url)) break;
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    saveToExcel(fileName) {
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(this.productCards);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'data');
        const resultPath = path.join(this.directory, `${fileName}_${this.runDate}.xlsx`);
        xlsx.writeFile(workbook, resultPath);
        return resultPath;
    }

    async runParser() {
        const mode = parseInt(await this.askUser("Введите 1 для парсинга категории целиком, 2 — по ключевым словам: "));
        if (mode === 1) {
            const localCataloguePath = await this.downloadCurrentCatalogue();
            console.log(`Каталог сохранен: ${localCataloguePath}`);
            const processedCatalogue = this.processCatalogue(localCataloguePath);
            const inputCategory = await this.askUser("Введите название категории или ссылку: ");
            const categoryData = this.extractCategoryData(processedCatalogue, inputCategory);
            if (!categoryData) return console.log("Категория не найдена");
            console.log(`Найдена категория: ${categoryData.name}`);
            await this.getAllProductsInCategory(categoryData);
            console.log(`Данные сохранены в ${this.saveToExcel(categoryData.name)}`);
        }
    }

    askUser(question) {
        return new Promise(resolve => {
            process.stdout.write(question);
            process.stdin.once('data', data => resolve(data.toString().trim()));
        });
    }
}

(async () => {
    const parser = new WildBerriesParser();
    await parser.runParser();
})();
