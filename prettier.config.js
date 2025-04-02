module.exports = {
    printWidth: 100, // Ширина строки перед переносом
    tabWidth: 4, // Количество пробелов в отступе
    useTabs: false, // Использовать пробелы вместо табов
    semi: true, // Ставить точку с запятой в конце строки
    singleQuote: true, // Использовать одинарные кавычки
    trailingComma: 'all', // Запятые в конце объектов и массивов
    bracketSpacing: true, // Пробелы между скобками в объектах { foo: bar }
    arrowParens: 'always', // Всегда использовать скобки в стрелочных функциях (a) => {}
    endOfLine: 'lf', // Линейные окончания в стиле Unix (LF)
    overrides: [
        {
            files: ['*.json', '*.yml', '*.yaml'],
            options: {
                tabWidth: 2, // Для JSON и YAML использовать 2 пробела
            },
        },
    ],
};
