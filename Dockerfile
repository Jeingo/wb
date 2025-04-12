FROM node:22-alpine

# Установим рабочую директорию
WORKDIR /app

# Копируем зависимости
COPY package.json yarn.lock ./

# Устанавливаем зависимости
RUN yarn install

# Копируем остальной код
COPY . .

# Запуск приложения
CMD ["yarn", "start"]
