import { SkynetClient, keyPairFromSeed } from "skynet-js";
import { sha3_512 } from 'js-sha3';
import BigPicture from 'bigpicture';
import VueCarousel from 'vue-carousel';
import uid from 'crypto-uid';
const linkifyUrls = require('linkify-urls');
// import merge from 'deepmerge';

var extMime = require('./mime-ext.json');
function swap(json){
  var ret = {};
  for(var key in json){
    ret[json[key]] = key;
  }
  return ret;
}
var mimeExt = swap(extMime)

var bp = BigPicture
window.bp = bp
var kpfs = keyPairFromSeed

const latinx = "ḀḁḂḃḄḅḆḇḈḉḊḋḌḍḎḏḐḑḒḓḔḕḖḗḘḙḚḛḜḝḞḟḠḡḢḣḤḥḦḧḨḩḪḫḬḭḮḯḰḱḲḳḴḵḶḷḸḹḺḻḼḽḾḿṀṁṂṃṄṅṆṇṈṉṊṋṌṍṎṏṐṑṒṓṔṕṖṗṘṙṚṛṜṝṞṟṠṡṢṣṤṥṦṧṨṩṪṫṬṭṮṯṰṱṲṳṴṵṶṷṸṹṺṻṼṽṾṿẀẁẂẃẄẅẆẇẈẉẊẋẌẍẎẏẐẑẒẓẔẕẖẗẘẙẚẛẜẝẞẟẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹỺỻỼỽỾỿ".split('')
const publicKeyToSkyforaId = (pubkey) => {
  let a = Array.from(pubkey), r = ''
  for (var i = 0; i < a.length; i++) {
    r = `${r}${latinx[a[i]]}`
  }
  return r
}
const skyforaIdToPublicKey = (skyforaId) => {
  let r = new Uint8Array(32);
  for (var i = 0; i < r.length; i++) {
    r[i] = latinx.indexOf(skyforaId.charAt(i))
  }
  return r
}

const uidByteLength = 18


Vue.use(VueCarousel);

var app = new Vue({
  el: '#app',
  components: {
    'postlist': httpVueLoader('postlist.vue')
  },
  data: {

    latinx: latinx,

    moment: moment,


    skyClient: undefined,

    conf: {
      skyPortal: 'https://siasky.net',
      channel: 'skyfora'
    },
    defConf: {
      skyPortal: 'https://siasky.net',
      channel: 'skyfora'
    },

    ui: {
      showHelp: false,
      el: {
        postEditor: undefined,
        sourceEditor: undefined,
        profileView: undefined,
        helpView: undefined,
        confEditor: undefined
      },

      cancelLoad: false,

      newSource: '',
      newSourceCache: undefined,
      newSourceStatus: '',
      newSourceOK: false,

      sidebarOpen: true,
      sidebarContent: 'login',

      loading: true,
      loadingContent: 'Loading...',

      shownReplies: {},

      newPost: {
        subject: '',
        text: '',
        files: [],
        media: [],
      }
    },

    hash: undefined,

    zoomedProfile: undefined,
    zoomedProfileId: undefined,
    zoomedPostId: undefined,

    user: {
      login: '',
      password: '',
      publicKey: '',
      privateKey: ''
    },
    loggedIn: false,
    userProfile: {
      name: 'anonymous'
    },
    userPosts: [],
    userWatchlist: [],
    userWatchlistCache: [],
    userWatchlistUrlLists: {},
    watchlistSourceCount: 0,
    dataCache: {},
    traceCachePosts: [],
    displayPosts: [],
    updateWatchlistPosts: 0,
    loadEndTimer: undefined
  },
  computed: {
    tripcode() {
      if (this.user.login.length > 0 && this.user.password.length > 0) {
        let tripcode = sha3_512(`${this.user.login}#${this.user.password}`)
        return tripcode
      }
      return undefined
    },
    userSkyforaId() {
      let r = ''
      if (this.user.publicKey.length > 0) {
        r = publicKeyToSkyforaId(this.user.publicKey)
      }
      else {
        for (var i = 0; i < 7; i++) {
          r = `${r}?`
        }
      }
      return r
    },
    watchlistPosts() {
      this.updateWatchlistPosts;
      let r = []
      let wp = this.dataCache
      wp = Object.entries(wp)
      for (var i = 0; i < wp.length; i++) {
        if (
          this.userWatchlist.indexOf(wp[i][0]) > -1 ||
          this.userWatchlistCache.indexOf(wp[i][0]) > -1
        ) {
          r.push(...wp[i][1].posts.map((x) => {
            return {
              ...{
                source: wp[i][0],
              },
              ...x
            }
          }))
        }
      }
      return r
    }
  },

  async mounted() {

    this.skyClient = new SkynetClient(this.conf.skyPortal)

    if (localStorage.skyforaLogin) {
      this.user.login = localStorage.skyforaLogin
    }
    if (localStorage.skyforaPassword) {
      this.user.password = localStorage.skyforaPassword
    }
    if (localStorage.skyforaPortal) {
      this.conf.skyPortal = localStorage.skyforaPortal
    }
    if (localStorage.skyforaChannel) {
      this.conf.channel = localStorage.skyforaChannel
    }

    this.processHash()

    window.addEventListener("hashchange", () => {
      this.processHash()
    });

    this.ui.el.postEditor = M.Modal.init(document.querySelector('#post-editor'))
    this.ui.el.helpView = M.Modal.init(document.querySelector('#help-view'))
    this.ui.el.sourceEditor = M.Modal.init(document.querySelector('#source-editor'))
    this.ui.el.profileView = M.Modal.init(document.querySelector('#profile-view'))
    this.ui.el.confEditor = M.Modal.init(document.querySelector('#conf-editor'))

    M.Tabs.init(document.querySelector('.tabs'))
    M.Dropdown.init(this.$refs.menuTrigger)
    M.Tooltip.init(document.querySelectorAll('.tooltipped'))

    this.$nextTick(()=> {
      this.refreshIdentity()
      this.loadProfile()
      if (this.tripcode) {
        this.ui.sidebarOpen = false
      }
    })
  },
  methods: {

    async processHash() {
      var hash = decodeURI(window.location.hash.substr(1))
      var self = this
      if (this.isSkyforaId(hash)) {
        this.hash = hash
        hash = hash.split(':')
        if (this.isSkyforaId(hash[0])) {
          var linkedProfile = await this.getProfileInfo(hash[0])

          this.zoomProfile(hash[0])
          this.zoomedPostId = hash[1]

        }
      }
    },

    saveConf() {
      if (confirm('Save these settings and reload?')) {
        localStorage.skyforaPortal = this.conf.skyPortal
        localStorage.skyforaChannel = this.conf.channel
        location.reload()
      }
    },

    restoreDefConf() {
      this.conf = JSON.parse(JSON.stringify(this.defConf))
      this.$nextTick()
    },
    shownProfileName(skyforaId) {
      let info = this.getProfileInfo(skyforaId)
      let fallback = `${skyforaId.substr(0, 7)}`

      if (info.data) {
        return info.data.profile.name && info.data.profile.name.trim().length > 0 ?
          info.data.profile.name :
          fallback
      }
      return fallback
    },

    unzoomProfile(){
      this.zoomedProfile = undefined
      this.zoomedProfileId = ''
      this.zoomedPostId = undefined
      window.location.hash = ``
      this.loadProfile()
    },

    async zoomProfile(skyforaId) {

      var self = this
      this.zoomedProfile = await this.getProfileInfo(skyforaId)
      this.zoomedProfileId = skyforaId

      window.location.hash = `${skyforaId}${this.zoomedPostId ? ':' + this.zoomedPostId : ''}`

      self.getZoomedProfilePosts()
      self.$nextTick(() => {
        self.$forceUpdate()
      })

    },

    getProfileLink(id) {
      function copyStringToClipboard (str) {
       // Create new element
       var el = document.createElement('textarea');
       // Set value (string to be copied)
       el.value = str;
       // Set non-editable to avoid focus and move outside of view
       el.setAttribute('readonly', '');
       el.style = {position: 'absolute', left: '-9999px'};
       document.body.appendChild(el);
       // Select text inside element
       el.select();
       // Copy text to clipboard
       document.execCommand('copy');
       // Remove temporary element
       document.body.removeChild(el);
      }
      let link = `${window.location.origin}/#${id}`
      copyStringToClipboard(
        link
      )
      M.toast({html: `Shareable profile link copied to clipboard!<br>${link}`})
    },

    // GUI
    refreshJdenticons() {
      if (typeof window.jdenticon == 'function') {
        window.jdenticon()
      }
    },
    openSidebar(content) {
      this.ui.sidebarContent = content
      this.ui.sidebarOpen = true
      this.$forceUpdate()
      var self = this
      this.$nextTick(()=>{
        self.refreshJdenticons()
      })
    },
    rnd(min, max) { //The maximum is exclusive and the minimum is inclusive
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min) + min);
    },
    bigpic($event, m, mindex, p) {

      if (m.type.startsWith('image/')) {
        bp({
          el: $event.target,
          gallery: p.media.filter(x => x.type.startsWith('image/')).map(x => {
            return {src: this.absSkylink(x.src)
          }}),
          position: mindex
        })
      }
      else if (m.type.startsWith('audio/')) {
        bp({
          el: $event.target,
          audio: this.absSkylink(m.src)
        })
      }
      else if (m.type.startsWith('video/')) {
        bp({
          el: $event.target,
          vidSrc: this.absSkylink(m.src)
        })
      }
      else if (
        m.type.startsWith('text/') ||
        m.type.endsWith('/pdf')
      ) {
        bp({
          el: $event.target,
          iframeSrc: this.absSkylink(m.src)
        })
      }
      else {
        var anchor = document.createElement('a');
        anchor.href = this.absSkylink(m.src);
        anchor.target = '_blank';
        anchor.download = `${this.siaLink(m.src)}${mimeExt[m.type]}`;
        anchor.click();
      }
    },
    showLoading(loadingContent) {
      this.ui.loading = true
      this.ui.loadingContent = loadingContent
    },
    hideLoading() {
      this.ui.loading = false
      this.ui.loadingContent = 'OK!'
    },

    // PROFILE
    addUserProfileField() {
      let fieldname = prompt('Field name (eg. name, age, gender, etc)')
      if (Object.keys(this.userProfile).indexOf(fieldname) > -1) {
        alert(`Field '${fieldname}' already exists.`)
      }
      else {
        this.userProfile[fieldname] = ''
        this.$forceUpdate()
      }
    },
    removeUserProfileField(field) {
      if(field == 'name') {
        return
      }
      delete this.userProfile[field]
      this.$forceUpdate()
      this.saveData()
    },


    // SKYNET
    async skynetError(err) {
      await alert(err)
      return (await confirm('Retry?'))
    },
    async skynetUpload(file) {
      try {
        return (await this.skyClient.uploadFile(file))
      } catch (error) {
        if (await this.skynetError(error)) {
          this.skynetUpload(file)
        }
      }
    },
    async skyDbRead(publicKey, dataKey) {
      try {
        const res = await this.skyClient.db.getJSON(publicKey, dataKey);

        return res
      } catch (error) {
        if (await this.skynetError(error)) {
          this.skyDbRead(publicKey, dataKey)
        }
      }
    },
    async skyDbWrite(privateKey, dataKey, json) {
      try {
        await this.skyClient.db.setJSON(privateKey, dataKey, json);
      } catch (error) {
        if (await this.skynetError(error)) {
          this.skyDbWrite(privateKey, dataKey, json)
        }
      }
    },
    siaLink(link) {
      return link.replace('sia:', '')
    },
    absSkylink(skylink) {
      skylink = this.siaLink(skylink)
      return `${this.conf.skyPortal}/${skylink}/`
    },

    // POST FORM
    selectMedia() {
      this.$refs.inputFile.click()
    },
    addMedia() {
      this.ui.newPost.files = this.ui.newPost.files.concat([...this.$refs.inputFile.files])
      this.$refs.inputFile.value = ''
      this.$forceUpdate()
    },
    async uploadMedia() {
      let files = this.ui.newPost.files

      if (files.length > 0) {
        let r = []
        for (var i = 0; i < files.length; i++) {

          this.showLoading(`Uploading file ${i+1}/${files.length} ...`)

          r.push({
            type: files[i].type,
            src: this.siaLink(await this.skynetUpload(files[i]))
          })
        }
        this.ui.newPost.media = this.ui.newPost.media.concat(r)
        delete this.ui.newPost.files
        this.hideLoading()
      }

    },
    clearPostForm() {
      this.ui.newPost.subject = ''
      this.ui.newPost.text = ''
      this.ui.newPost.media = []
      this.ui.newPost.id = ''
      this.ui.newPost.source = ''
      this.$refs.inputFile.value=''
    },

    reloadAll() {
      this.loadProfile()

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    },

    async addPost() {

      await this.uploadMedia()

      this.ui.newPost.created = (new Date())
      this.ui.newPost.id = (uid(uidByteLength))
      this.ui.newPost.source = this.userSkyforaId
      this.userPosts.unshift(JSON.parse(JSON.stringify(this.ui.newPost)))

      this.$forceUpdate()

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })

      this.ui.el.postEditor.close()
      this.saveData()
    },
    async updatePost() {


      await this.uploadMedia()

      let p = this.userPosts
      p = p.filter(x => x.id == this.ui.newPost.id)[0]
      let pindex = this.userPosts.indexOf(p)
      this.ui.newPost.updated = (new Date())
      let a = this.userPosts[pindex]
      this.userPosts[pindex] = JSON.parse(JSON.stringify(this.ui.newPost))

      this.ui.el.postEditor.close()
      this.saveData()
    },
    createPost(replyTo) {
      if (replyTo !== undefined) {
        this.ui.newPost.subject = `${this.getPostId(replyTo)}`
      }
      else {
        this.clearPostForm()
      }

      this.ui.el.postEditor.open()

      this.$nextTick(() => {
        M.textareaAutoResize(document.getElementById('post-textarea'));
      })
    },
    editPost(post) {
      this.ui.newPost = JSON.parse(JSON.stringify(post))
      this.ui.newPost.files = []

      this.ui.el.postEditor.open()
    },
    removePost(post) {
      if (confirm('Are you sure you want to delete this post?')) {
        this.userPosts.splice(this.userPosts.indexOf(post), 1)
        this.saveData()
      }
    },

    openSourceEditor(source) {

      this.ui.newSourceCache = undefined
      this.ui.newSourceOK = false
      this.ui.newSourceStatus = ''
      this.ui.el.sourceEditor.open()

      if (source) {
        this.ui.newSource = source
        if (this.isSkyforaId(source)) {
          this.processSourceInput()
        }
        else {
          this.processSourceBtn()
        }
      }
      else {
        this.ui.newSource = ''
      }
    },
    addSourceToWatchlist(source) {

      if (source) {
        if (this.userSkyforaId == source) {
          alert('You cannot follow youself.')
        }
        else {
          if (this.userWatchlist.indexOf(source) < 0) {
            this.userWatchlist.push(source)
            this.saveData()
            this.ui.el.sourceEditor.close()
          }
          else {
            alert('Source is already in your watchlist.')
          }
        }
      }

      this.$nextTick(()=>{
        this.refreshDisplayPosts()
        this.$forceUpdate()
      })

    },
    removeSourceFromWatchlist(source) {
      if (confirm('Are you sure you want to remove this source?')) {
        this.userWatchlist.splice(this.userWatchlist.indexOf(source), 1)
        this.saveData()
      }
    },

    showZoomedProfile() {
      let e = ''
      let pe = Object.entries(this.zoomedProfile.data.profile)
      let pdata = ``
      for (var i = 0; i < pe.length; i++) {
        pdata += `${pe[i][0]}: ${pe[i][1].length ? pe[i][1] : '&lt;undefined&gt;'}\n`
      }

      this.ui.el.profileView.open()
    },

    logoutProfile() {

      if (!confirm('Are you sure you want to logout?')) {
        return
      }

      this.cancelLoad = true
      var self = this

      function lo() {
        self.zoomedProfile = undefined
        self.zoomedProfileId = undefined

        self.user = {
          login: '',
          password: '',
          publicKey: '',
          privateKey: ''
        }
        self.loggedIn = false
        self.userProfile = {
          name: 'anonymous'
        }
        self.userPosts = []
        self.userWatchlist = []
        self.userWatchlistCache = []
        self.userWatchlistUrlLists = {}
        self.watchlistSourceCount = 0
        self.dataCache = {}
        self.traceCachePosts = []
        self.displayPosts = []
        self.updateWatchlistPosts++

        self.tickStatus('', ' ')
      }

      if (
        localStorage.skyforaLogin == this.user.login &&
        localStorage.skyforaPassword == this.user.password
      ) {
        if (
          confirm(`Do you want to forget these credentials? ( ${this.user.login} )`)
        ) {
          localStorage.skyforaLogin = ''
          localStorage.skyforaPassword = ''
          this.loggedIn = false
          location.reload()
        }
        else {
          lo()

          this.refreshIdentity()
        }
      }
      else {
        lo()

        this.refreshIdentity()
      }

    },
    async loadProfile(first) {

      if ( !this.tripcode ) {
        this.hideLoading()
        return
      }

      if (first) {
        if (
          confirm('Do you want to remember these credentials in this device (unsafe) ?')
        ) {
          localStorage.skyforaLogin = this.user.login
          localStorage.skyforaPassword = this.user.password
        }
      }

      this.showLoading(`Loading profile...`)
      this.userPosts = []
      this.userWatchlist = []

      let res = await this.skyDbRead(this.user.publicKey, this.conf.channel)
      this.loggedIn = true
      if (res !== null) {
        if (res.data.posts) {
          this.userPosts = res.data.posts.map((x) => {
            return {
              ...{source: this.userSkyforaId},
              ...x
            }
          })
        }
        if (res.data.profile) {
          this.userProfile = res.data.profile
        }
        if (res.data.watchlist) {
          this.userWatchlist = res.data.watchlist

          await this.loadWatchlist()
        }

      }
      else {
        this.userPosts = []
        this.userWatchlist = []
        this.userProfile = {
          name: 'anonymous'
        }
      }
      this.hideLoading()
    },
    loadWatchlistEnd() {

    },
    async loadWatchlist() {
      var self = this

      this.cancelLoad = false

      self.userWatchlistCache = []

      var w = this.userWatchlist

      var watchlistCount = 0, wlc = 0, errorCount = 0

      function loadingMsg(skyforaId, url) {

        if (url) {
          self.tickStatus(`[${wlc + errorCount + 1}/${watchlistCount}] Loading ${skyforaId} (${wi})`)
        }
        else {
          self.tickStatus(`[${wlc + errorCount + 1}/${watchlistCount}] Loading ${skyforaId}`)
        }
        clearTimeout(self.loadEndTimer)
      }
      function finishedMsg() {

        var currentdate = new Date();
        var time = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/"
                + currentdate.getFullYear() + " @ "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();
        let msg = `Last sync: ${time}  `
        msg += `[ ${wlc} loaded / ${errorCount} errors / ${watchlistCount} total ]`
        self.watchlistSourceCount = watchlistCount

        self.loadEndTimer = setTimeout(()=> {
          self.loadWatchlistEnd()
        }, 500)

        self.tickStatus(msg, 'done_all')
      }

      for (var i = 0; i < w.length; i++) {
        if (self.cancelLoad) {
          self.cancelLoad = false
          return null
        }
        if (this.isSkyforaId(w[i])){
          watchlistCount++
          loadingMsg(w[i])

          let res = await this.skyDbRead(skyforaIdToPublicKey(w[i]), this.conf.channel)
          if (res) {
            wlc++
            this.dataCache[w[i]] = res.data

          }
          else {
            errorCount++
          }
          finishedMsg()
        }
        else {
          let xhr
          if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest()
          }
          await xhr.open(
            'GET',
            w[i],
            true
          )
          var wi = w[i]
          xhr.onload = async () => {
            if (xhr.status != 200) {
              console.error(`Error ${xhr.status}: ${xhr.statusText}`)
            } else {

              let listIds = self.matchSkyforaIds(xhr.response)

              watchlistCount += listIds.length

              for (var j = 0; j < listIds.length; j++) {
                if (self.cancelLoad) {
                  self.cancelLoad = false
                  return null
                }

                if (self.isSkyforaId(listIds[j])){
                  loadingMsg(listIds[j], true)
                  let res = await self.skyDbRead(skyforaIdToPublicKey(listIds[j]), self.conf.channel)
                  if (res) {
                    wlc++
                    self.userWatchlistUrlLists[listIds[j]] = wi
                    self.userWatchlistCache.push(listIds[j])
                    self.dataCache[listIds[j]] = res.data
                    self.updateWatchlistPosts++
                    self.refreshDisplayPosts()
                  }
                  else {
                    errorCount++
                  }
                  finishedMsg()
                }
              }
            }
          }
          await xhr.send()
        }

      }

      this.$nextTick(()=>{
        this.updateWatchlistPosts++
        this.refreshDisplayPosts()
        this.$forceUpdate()
      })
    },

    async saveData() {
      this.showLoading(`Saving changes...`)

      await this.skyDbWrite(this.user.privateKey, this.conf.channel, {
        profile: this.userProfile,
        posts: this.userPosts,
        watchlist: this.userWatchlist
      })

      if (this.zoomedProfileId) {
        this.zoomProfile(this.zoomedProfileId)
      }

      await this.refreshDisplayPosts()

      this.clearPostForm()

      this.$nextTick(()=> {
        this.$forceUpdate()
        this.hideLoading()
        this.loadProfile()
      })
    },

    refreshIdentity() {
      if (this.tripcode !== undefined) {
        this.showLoading(`Refreshing identity...`)

        let { publicKey, privateKey } = kpfs(this.tripcode)

        this.user.publicKey = publicKey
        this.user.privateKey = privateKey

        this.hideLoading()

        var self = this
        this.$nextTick(()=>{
          self.refreshJdenticons()
        })
      }
      else {
        this.user.publicKey = ''
        this.user.privateKey = ''
      }



    },

    async processSourceBtn() {
      this.ui.newSourceOK = false

      if (this.isSkyforaId(this.ui.newSource)) {
        this.processSourceInput()
        return
      }

      var self = this
      let xhr
      if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest()
      }
      await xhr.open(
        'GET',
        this.ui.newSource,
        true
      )
      xhr.onload = async () => {
        if (xhr.status != 200) {
          self.ui.newSourceStatus = `Error loading URL`
          this.ui.newSourceOK = false
          this.ui.newSourceCache = undefined
        } else {
          self.ui.newSourceStatus = `Found ${self.matchSkyforaIds(xhr.response).length} IDs in URL`
          this.ui.newSourceOK = true
        }
      }
      await xhr.send()
    },
    processSourceInput() {

      if (this.isSkyforaId(this.ui.newSource)) {
        this.ui.newSourceStatus = 'Loading...'
        this.loadNewSource()
      }
      else {
        this.ui.newSourceStatus = ''
        this.ui.newSourceOK = false
        this.ui.newSourceCache = undefined
      }

    },

    async loadNewSource() {
      let res = await this.skyDbRead(skyforaIdToPublicKey(this.ui.newSource), this.conf.channel)

      if (res && res.data) {
        this.ui.newSourceCache = res.data
        this.ui.newSourceStatus = ''
        this.ui.newSourceOK = true
      }
      else {
        this.ui.newSourceCache = undefined
        this.ui.newSourceStatus = 'Profile not found.'
        this.ui.newSourceOK = false
      }

      this.refreshJdenticons()
      this.$forceUpdate()

    },

    async loadPost(postId) {
      let skyforaId = postId.split(':')[0]
      let id = postId.split(':')[1]
      let res = this.getProfileInfo(skyforaId)

      if (res && res.data) {
        this.dataCache[skyforaId] = res.data

        if (res.data.posts) {
          let ps = res.data.posts.filter(x => x.id == id)
          if (ps.length == 1) {
            return ps[0]
          }
        }
      }
      return {
        loadStatus: 'notfound',
        id: id,
        source: skyforaId,
        subject: 'POST NOT FOUND',
        text: `POST: ${id} \nFROM: ${skyforaId}\nNOT FOUND`,
      }
    },
    async getPostTrace(r) {

      var postTrack = []

      var self = this
      var trace = async (p) => {
        postTrack.push(p)
        if (self.isPostId(p.subject)) {
          await trace(await self.loadPost(p.subject))
        }
      }
      await trace(r)

      postTrack = postTrack.reverse()
      while (postTrack.length > 1) {
        postTrack[0].replies = postTrack.splice(1,1)
      }

      return postTrack

    },
    async getZoomedProfilePosts() {
      this.showLoading('Loading profile posts...')
      this.refreshDisplayPosts(this.zoomedProfile.data.posts, false)
    },
    async refreshDisplayPosts(postlist, traceReps) {
      if (postlist == undefined) {
        if (this.zoomedProfile) {
          // prevent reloading when zoomed on profile
          return
        }
        postlist = this.getPosts()
      }

      let dp = postlist

      if (!traceReps) {
        var allReps = dp.filter(x => this.isPostId(x.subject))
        dp = dp.filter(x => !this.isPostId(x.subject))

        var populateReps = (list) => {
          for (var i = 0; i < list.length; i++) {
            let idx = allReps.indexOf(list[i])
            if ( idx > -1) {
              allReps.splice(idx, 1)
            }
            list[i].replies = this.getPosts(this.getPostId(list[i]))
            if (list[i].replies.length > 0) {
              try {
                populateReps(list[i].replies)
              } catch (e) {
                console.error(e)

              }
            }
          }
        }
        populateReps(dp)
        for (var i = 0; i < allReps.length; i++) {
          dp.push(
            ...(await this.getPostTrace(allReps[i]))
          )

        }
      }

      // mergePosts()

      var getLatestReplyTime = (list) => {
        var time = (new Date(-8640000000000000)), ltime

        for (var i = 0; i < list.length; i++) {
          ltime = (new Date(list[i].created))
          if (ltime > time) {
            time = ltime
          }
          if (list[i].replies && list[i].replies.length > 0) {
            ltime = getLatestReplyTime(list[i].replies)
            if (ltime > time) {
              time = ltime
            }
          }
        }

        return time
      }
      dp = dp.sort((a,b) => {
        return getLatestReplyTime([b]) - getLatestReplyTime([a])
      })

      this.displayPosts = dp

      this.$nextTick(()=>{
        this.refreshJdenticons()
        M.Tooltip.init(document.querySelectorAll('.tooltipped'))

        this.hideLoading()

        this.$forceUpdate()


      })
    },

    isSkyforaId(s) {
      let a = /([ḀḁḂḃḄḅḆḇḈḉḊḋḌḍḎḏḐḑḒḓḔḕḖḗḘḙḚḛḜḝḞḟḠḡḢḣḤḥḦḧḨḩḪḫḬḭḮḯḰḱḲḳḴḵḶḷḸḹḺḻḼḽḾḿṀṁṂṃṄṅṆṇṈṉṊṋṌṍṎṏṐṑṒṓṔṕṖṗṘṙṚṛṜṝṞṟṠṡṢṣṤṥṦṧṨṩṪṫṬṭṮṯṰṱṲṳṴṵṶṷṸṹṺṻṼṽṾṿẀẁẂẃẄẅẆẇẈẉẊẋẌẍẎẏẐẑẒẓẔẕẖẗẘẙẚẛẜẝẞẟẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹỺỻỼỽỾỿ]{32})/.test(s)
      return a
    },
    isPostId(s) {
      let a = /([ḀḁḂḃḄḅḆḇḈḉḊḋḌḍḎḏḐḑḒḓḔḕḖḗḘḙḚḛḜḝḞḟḠḡḢḣḤḥḦḧḨḩḪḫḬḭḮḯḰḱḲḳḴḵḶḷḸḹḺḻḼḽḾḿṀṁṂṃṄṅṆṇṈṉṊṋṌṍṎṏṐṑṒṓṔṕṖṗṘṙṚṛṜṝṞṟṠṡṢṣṤṥṦṧṨṩṪṫṬṭṮṯṰṱṲṳṴṵṶṷṸṹṺṻṼṽṾṿẀẁẂẃẄẅẆẇẈẉẊẋẌẍẎẏẐẑẒẓẔẕẖẗẘẙẚẛẜẝẞẟẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹỺỻỼỽỾỿ]{32}:[A-Za-z0-9_-]{24})/.test(s)
      return a
    },
    matchSkyforaIds(s){
      return s.match(/([ḀḁḂḃḄḅḆḇḈḉḊḋḌḍḎḏḐḑḒḓḔḕḖḗḘḙḚḛḜḝḞḟḠḡḢḣḤḥḦḧḨḩḪḫḬḭḮḯḰḱḲḳḴḵḶḷḸḹḺḻḼḽḾḿṀṁṂṃṄṅṆṇṈṉṊṋṌṍṎṏṐṑṒṓṔṕṖṗṘṙṚṛṜṝṞṟṠṡṢṣṤṥṦṧṨṩṪṫṬṭṮṯṰṱṲṳṴṵṶṷṸṹṺṻṼṽṾṿẀẁẂẃẄẅẆẇẈẉẊẋẌẍẎẏẐẑẒẓẔẕẖẗẘẙẚẛẜẝẞẟẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹỺỻỼỽỾỿ]{32})/g)
    },
    matchPostIds(s) {
      return s.match(/([ḀḁḂḃḄḅḆḇḈḉḊḋḌḍḎḏḐḑḒḓḔḕḖḗḘḙḚḛḜḝḞḟḠḡḢḣḤḥḦḧḨḩḪḫḬḭḮḯḰḱḲḳḴḵḶḷḸḹḺḻḼḽḾḿṀṁṂṃṄṅṆṇṈṉṊṋṌṍṎṏṐṑṒṓṔṕṖṗṘṙṚṛṜṝṞṟṠṡṢṣṤṥṦṧṨṩṪṫṬṭṮṯṰṱṲṳṴṵṶṷṸṹṺṻṼṽṾṿẀẁẂẃẄẅẆẇẈẉẊẋẌẍẎẏẐẑẒẓẔẕẖẗẘẙẚẛẜẝẞẟẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹỺỻỼỽỾỿ]{32}:[A-Za-z0-9_-]{24})/g)
    },
    getPosts(filterStr) {
      let r = []

      if (filterStr && filterStr.length > 0) {

        r.push(...this.userPosts.filter(x => {
          return x.subject.indexOf(filterStr) > -1
          && x.id != filterStr.split(':')[1]
          // || x.text.indexOf(filterStr) > -1
        }))
        r.push(...this.watchlistPosts.filter(x => {
          return x.subject.indexOf(filterStr) > -1
          && x.id != filterStr.split(':')[1]
          // || x.text.indexOf(filterStr) > -1
        }))
      }
      else {
        r.push(...this.userPosts)
        r.push(...this.watchlistPosts)
      }

      r = r.sort((a,b)=>{
        return (new Date(b.created)) - (new Date(a.created))
      })
      return r
    },
    getPostId(p) {
      return `${p.source}:${p.id}`
    },
    getPostReplies(p) {

      let replyStr = this.getPostId(p)
      let posts = this.getPosts(replyStr)
      return posts

    },
    postTextFilter(text) {

      // let replies = text.match(/([ḀḁḂḃḄḅḆḇḈḉḊḋḌḍḎḏḐḑḒḓḔḕḖḗḘḙḚḛḜḝḞḟḠḡḢḣḤḥḦḧḨḩḪḫḬḭḮḯḰḱḲḳḴḵḶḷḸḹḺḻḼḽḾḿṀṁṂṃṄṅṆṇṈṉṊṋṌṍṎṏṐṑṒṓṔṕṖṗṘṙṚṛṜṝṞṟṠṡṢṣṤṥṦṧṨṩṪṫṬṭṮṯṰṱṲṳṴṵṶṷṸṹṺṻṼṽṾṿẀẁẂẃẄẅẆẇẈẉẊẋẌẍẎẏẐẑẒẓẔẕẖẗẘẙẚẛẜẝẞẟẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹỺỻỼỽỾỿ]{32}:[A-Za-z0-9_-]{24})/)

      text = linkifyUrls(text, {
        attributes: {
          target: '_blank',
        }
      })

      return text
    },

    tickStatus(text, icon) {
      let iconname = icon ? icon : 'hourglass_empty'

      let el = this.$refs.statusTicker

      el.innerHTML = `<i class="material-icons">${iconname}</i> ${text}`
    },

    hoverProfile(p) {

    },
    getProfileInfo(skyforaId) {
      if (this.userSkyforaId == skyforaId) {
        return {
          rel: 'me',
          data: {
            profile: this.userProfile,
            posts: this.userPosts,
            watchlist: this.userWatchlist
          }
        }
      }
      if (this.userWatchlistUrlLists[skyforaId]) {
        return {
          rel: this.userWatchlistUrlLists[skyforaId],
          data: this.dataCache[skyforaId]
        }
      }
      else if (this.userWatchlist.indexOf(skyforaId) > -1) {
        return {
          rel: 'watchlist',
          data: this.dataCache[skyforaId]
        }
      }
      else {
        if (this.dataCache[skyforaId] !== undefined) {
          return {
            rel: 'unknown',
            data: this.dataCache[skyforaId]
          }
        }
        else {
          var self = this
          return this.skyDbRead(skyforaIdToPublicKey(skyforaId), this.conf.channel)
          .then(res => {
            if (res !== null) {
              self.dataCache[skyforaId] = res.data
              return {
                rel: 'unknown',
                data: self.dataCache[skyforaId]
              }
            }
          })

        }

      }
    },

    hideReplies(p) {
      this.ui.shownReplies[this.getPostId(p)] = false

      this.$nextTick(()=>{
        this.refreshJdenticons()
        M.Tooltip.init(document.querySelectorAll('.tooltipped'))
        this.$forceUpdate()
      })
    },
    showReplies(p) {
      this.ui.shownReplies[this.getPostId(p)] = true

      this.$nextTick(()=>{
        this.refreshJdenticons()
        M.Tooltip.init(document.querySelectorAll('.tooltipped'))
        this.$forceUpdate()
      })
    }

  }
})

window.skyforaApp = app