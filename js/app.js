import {
  get,
  set,
  getMany,
  setMany,
  update,
  del,
  clear,
  keys,
  values,
  entries,
  createStore,
} from "https://cdn.jsdelivr.net/npm/idb-keyval@5/dist/esm/index.js";


const APP = {
  BASE_URL: "https://api.themoviedb.org/3/",
  IMG_URL: "https://image.tmdb.org/t/p/",
  backdrop_sizes: ["w300", "w780", "w1280", "original"],
  logo_sizes: ["w45", "w92", "w154", "w185", "w300", "w500", "original"],
  poster_sizes: ["w92", "w154", "w185", "w342", "w500", "w780", "original"],
  profile_sizes: ["w45", "w185", "h632", "original"],
  still_sizes: ["w92", "w185", "w300", "original"],
  API_KEY: "1548820d416f15b2d6609bd2fa9d9de7",
  isOnline: "onLine" in navigator && navigator.onLine,
  isStandalone: false,
  sw: null,
  db: null,
  movieStore: null,
  dbVersion: 3,

  init() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
      console.log("service worker registered");
    }
    APP.openDB();
    // APP.pageLoaded();
    APP.addListeners();

    if (navigator.standalone) {
      APP.isStandalone = true;
    } else if (matchMedia("(display-mode: standalone)").matches) {
      APP.isStandalone = true;
    } else {
      APP.isStandalone = false;
    }
  },

  pageLoaded() {
    console.log("IM A PAGE AND IM LOADED");
    
    function getParameterByName(name) {
      var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
      return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
    
    let tx = APP.createTX('movieStore' , "readonly")
    tx.oncomplete = (ev)=>{
      console.log("transaction complete" , ev)
    }

    let store = tx.objectStore("movieStore");
    let request = store.getAll(getParameterByName("keyword"));

    request.onsuccess = (ev)=>{
      console.log("successfully got a thing from db, im going to call build list now uwu")
      let arr = ev.target.result
      console.log(arr)

      APP.buildList(arr);
    }
  },

  addListeners() {
    document.getElementById("searchForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      APP.formSubmission(ev);
    });

    window.addEventListener("appinstalled", (evt) => {
      console.log("app was installed");
    });

    if (movies) {
      movies.addEventListener("click", (ev) => {
        ev.preventDefault();
        let anchor = ev.target;
        if (anchor.tagName === "A") {
          let card = anchor.closest(".card");
          let title = card.querySelector(".card-title span").textContent;
          let mid = card.getAttribute("data-id");
          let base = location.origin;
          let url = new URL("./suggest.html", base);
          url.search = `?movie_id=${mid}&ref=${encodeURIComponent(title)}`;
          location.href = url;
        }
      });
    }
  },

  sendMessage(msg, target) {
    //TODO:
    //send a message to the service worker
  },

  onMessage({ data }) {
    //TODO:
    //message received from service worker
  },

  async getData(keyword) {
    console.log("YOU ARE TRYING TO GET SOME DATA SOONNN");
    let URL = `${APP.BASE_URL}search/movie?api_key=${APP.API_KEY}&query=${keyword}`;
    console.log(URL, "IM A URL");
    const response = await fetch(URL);

    try {
      if (response.ok) {
        let movieResults = {
          keyword: keyword,
          results: await response.json(),
        };
        console.log("HEEEY  IM IN GET DATA AFTER THE OBJECT THING WEEEEEEEE");
        APP.saveMovieToDB(movieResults);
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      console.warn(err);
    }
  },

  checkDB(keyword){
    let tx = APP.createTX('movieStore' , "readonly")
    tx.oncomplete = (ev)=>{
      console.log("db check completed" , ev)
    }

    let store = tx.objectStore("movieStore");
    let request = store.getAll(keyword);

    request.onsuccess = (ev)=>{
      console.log("successfully got a thing from db, im going to call build list now uwu")
      let arr = ev.target.result
      console.log(arr)
      // APP.buildList(arr)
    }

  },

  buildList(movies){
    console.log(movies)
    let movieRes = movies[0].results
    let movieResults = movieRes.results

    console.log("IM BUILDING A LIST")
    let movieDiv = document.querySelector(".movies");
    movieDiv.innerHTML = "";
    console.log("MOVIES!", movies);

    console.log(`show ${movieResults.length} cards`);
    let container = document.querySelector(`.movies`);
    if (container) {
      if (movieResults.length > 0) {
        container.innerHTML = movieResults
          .map((obj) => {
            let img = "./img/icon-512x512.png";
            if (obj.poster_path != null) {
              img = APP.IMG_URL + "w500/" + obj.poster_path;
            } else{
              console.log("add image plz :(")
            }
            return `<div class="card hoverable large" data-id="${obj.id}">
          <div class="card-image">
            <img src="${img}" alt="movie poster" class="notmaterialboxed"/>
            </div>
          <div class="card-content activator">
            <h3 class="card-title"><span>${obj.title}</span><i class="material-icons right">more_vert</i></h3>
          </div>
          <div class="card-reveal">
            <span class="card-title grey-text text-darken-4">${obj.title}<i class="material-icons right">close</i></span>
            <h6>${obj.release_date}</h6>
            <p>${obj.overview}</p>
          </div>
          <div class="card-action">
            <a href="#" class="find-suggested light-blue-text text-darken-3">Show Similar<i class="material-icons right">search</i></a>
          </div>
        </div>`;
          })
          .join("\n");
      } else {
        //no cards
        container.innerHTML = `<div class="card hoverable">
          <div class="card-content">
            <h3 class="card-title activator"><span>No Content Available.</span></h3>
          </div>
        </div>`;
      }
    }
  },

  openDB() {
    let DBOpenReq = indexedDB.open("APP_DB", APP.dbVersion);

    DBOpenReq.addEventListener("success", (ev) => {
      APP.db = ev.target.result;
      console.log("FUYCK YEAH! DB success", APP.db);
      APP.pageLoaded()
    });

    DBOpenReq.addEventListener("upgradeneeded", (ev) => {
      APP.db = ev.target.result;
      console.log("DB upgrade", APP.db);

      let oldVersion = ev.oldVersion;
      let newVersion = ev.newVersion || APP.db.dbVersion;
      console.log(`DB updated from ${oldVersion} to ${newVersion}`);

      if (
        !APP.db.objectStoreNames.contains("movieStore" && "suggestionStore")
      ) {
        APP.movieStore = APP.db.createObjectStore("movieStore", {
          keyPath: "keyword",
        });
        APP.db.createObjectStore("suggestionStore", { keyPath: "id" });
      }
    }),
      DBOpenReq.addEventListener("error", (err) => {
        console.warn(err);
      });
  },

  formSubmission(ev) {
    ev.preventDefault();
    console.log(`EVENT : ${ev}`);
    const keyword = ev.target.search.value;
    APP.getData(keyword);
  },

  saveMovieToDB(movieResults) {
    console.log("YOU ARE TRYING TO SAVE THE MOVIE TO THE DB");
    console.log(movieResults)
    let keyword = movieResults.keyword

    let tx = APP.db.transaction("movieStore", "readwrite");
    tx.oncomplete = (ev) => {
      console.log("On completed triggered", ev);
      window.location.href = `/results.html?keyword=${keyword}`;
      APP.checkDB(keyword)
    };
    tx.onerror = (err) => {
      console.warn(err);
    };

    let store = tx.objectStore("movieStore");
    let request = store.add(movieResults);

    request.onsuccess = (ev) => {
      console.log("succesfully added an object", ev);
    };

    request.oncomplete = (ev) => {
      console.log("Transaction completed: ", ev);
    };

    request.onerror = (err) => {
      console.warn(err);
    };
  },

  createTX(storeName, mode) {
    console.log(APP.db);
    let tx = APP.db.transaction(storeName, mode);
    tx.onerror = (err) => {
      console.warn(err);
    };
    return tx;
  },
};

document.addEventListener("DOMContentLoaded", APP.init);
