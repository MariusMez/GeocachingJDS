FROM node:10
ENV FORCE_COLOR=1
RUN npm install -g npm@6.9.0
#RUN mkdir -p /app
WORKDIR /app
#COPY package.json /app/
#RUN npm install
#COPY . /app
#EXPOSE 4040
#EXPOSE 8080
#EXPOSE 80
#CMD [ "npm", "start" ]
