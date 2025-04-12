FROM node:20

# Установим рабочую директорию
WORKDIR /app

# Копируем зависимости
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальной код
COPY . .

# Запуск приложения
CMD ["npm", "start"]
