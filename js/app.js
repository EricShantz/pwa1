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
  dbVersion: 1,

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

  addListeners() {
    document.getElementById("searchForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      APP.formSubmission(ev);
    });
    
    window.addEventListener("appinstalled", (evt) => {
      console.log("app was installed");
    });
    
    let movies = document.querySelector('.movies');
    if (movies) {
      //navigate to the suggested page
      //build the queryString with movie id and ref title
      movies.addEventListener('click', (ev) => {
        ev.preventDefault();
        let anchor = ev.target;
        if (anchor.tagName === 'A') {
          let card = anchor.closest('.card');
          let title = card.querySelector('.card-title span').textContent;
          let id = card.getAttribute('data-id');
          let base = location.origin;
          let url = new URL('./suggest.html', base);
          url.search = `?movie_id=${id}&ref=${encodeURIComponent(title)}`;
          location.href = url;
        } }
        )}
  },
    
  sendMessage(msg, target) {
          //TODO:
          //send a message to the service worker
  },
    
  onMessage({ data }) {
          //TODO:
          //message received from service worker
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

  pageLoaded() {
    console.log("IM A PAGE AND IM LOADED");

      let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');
    if (keyword) {
      //means we are on results.html
      console.log(`on results.html - startSearch(${keyword})`);
      APP.checkDB(keyword);
    }
    let id = parseInt(params.get('movie_id'));
    let ref = params.get('ref');
    if (id && ref) {
      //we are on suggest.html
      console.log(`look in db for movie_id ${id} or do fetch`);
      APP.checkSuggestDB({ id, ref });
    }
    },

  formSubmission(ev) {
    ev.preventDefault();
    console.log(`EVENT : ${ev}`);
    const keyword = ev.target.search.value;
    console.log(`KEYWORD: ${keyword}`);
    // APP.checkDB(keyword);
    if(keyword){
      window.location.href = `/results.html?keyword=${keyword}`;
    }
  },

  checkDB(keyword){
    console.log("CHECK DB " , keyword)
    let tx = APP.createTX('movieStore' , "readonly")
    tx.oncomplete = (ev)=>{
      console.log("db check completed" , ev)
    }

    let store = tx.objectStore("movieStore");
    console.log("KEYWORD" , keyword)
    let request = store.getAll(keyword);
    console.log(request)

    request.onsuccess = (ev)=>{
      let arr = ev.target.result
      console.log(arr)
      if(arr.length === 0){
        APP.getData(keyword)
      }else{
        APP.buildListFromDB(arr)
      }
    }
  },

  async getData(keyword) {
          console.log("YOU ARE TRYING TO GET SOME DATA SOONNN");
          console.log(keyword)
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

  saveMovieToDB(movieResults) {
    console.log("YOU ARE TRYING TO SAVE THE MOVIE TO THE DB");
    console.log(movieResults)
    let movieRes = movieResults.results

    let tx = APP.db.transaction("movieStore", "readwrite");
    tx.oncomplete = (ev) => {
      console.log("On completed triggered", ev);
      APP.buildList(movieRes)
      // window.location.href = `/results.html?keyword=${keyword}`;

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

  buildList(movies){
    console.log(movies)
    // let movieRes = movies[0].results
    let movieResults = movies.results

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

  buildListFromDB(movies){
    console.log(movies)
    let movieRes = movies[0].results
    console.log(movieRes)
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

  createTX(storeName, mode) {
    console.log(APP.db);
    let tx = APP.db.transaction(storeName, mode);
    tx.onerror = (err) => {
      console.warn(err);
    };
    return tx;
  },

  checkSuggestDB({id , ref}){
    console.log("CHECK DB " , id)
    let tx = APP.createTX('suggestionStore' , "readonly")
    tx.oncomplete = (ev)=>{
      console.log("db check completed" , ev)
    }

    let store = tx.objectStore("suggestionStore");
    console.log("ID" , id)
    let request = store.getAll(id);
    console.log(request)

    request.onsuccess = (ev)=>{
      let arr = ev.target.result
      console.log(arr)
      if(arr.length === 0){
        APP.getSuggestedData({id , ref})
      }else{
        APP.buildListFromDB(arr)
      }
    }
  },


  async getSuggestedData({id , ref}) {
    console.log("YOU ARE TRYING TO GET SOME DATA SOONNN");
    console.log(id)
    let url = `${APP.BASE_URL}movie/${id}/similar?api_key=${APP.API_KEY}&ref=${ref}`;;
    console.log(url, "IM A URL");
    const response = await fetch(url);

try {
if (response.ok) {
  let suggestResults = {
    id: id,
    results: await response.json(),
  };
  console.log("HEEEY  IM IN GET DATA AFTER THE OBJECT THING WEEEEEEEE" , suggestResults);
  APP.saveSuggestToDB(suggestResults);
} else {
  throw new Error(response.message);
}
} catch (err) {
console.warn(err);
}
},

saveSuggestToDB(suggestResults) {
  console.log("YOU ARE TRYING TO SAVE THE MOVIE TO THE DB");
  console.log(suggestResults)
  let suggestRes = suggestResults.results

  let tx = APP.db.transaction("suggestionStore", "readwrite");
  tx.oncomplete = (ev) => {
    console.log("On completed triggered", ev);
    APP.buildList(suggestRes)
    // window.location.href = `/results.html?keyword=${keyword}`;

  };
  tx.onerror = (err) => {
    console.warn(err);
  };

  let store = tx.objectStore("suggestionStore");
  let request = store.add(suggestResults);

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
  
}

document.addEventListener("DOMContentLoaded", APP.init);
