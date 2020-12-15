<template lang="html">
  <div class="posts">

    <div
      class="post"
      :id="`${p.id}`"
      v-for="(p, pindex) in posts"
      :key="pindex"
      >
      <div
        class="card horizontal post-card"
        :class="{
          focused: shownReplies[getPostId(p)],

          mine: profileInfo(p.source).rel == 'me',
          zoomed: zoomedProfile == p.source && zoomedPostId == p.id
        }"
      >
        <div class="card-image" v-if="p.media && p.media[0]">
          <carousel class="media"
            :per-page="1"
            :navigation-enabled="true"
            :autoplay="true"
            :autoplay-timeout="rnd(5000, 9000)"
            :loop="true"
            :autoplay-hover-pause="false"
          >
            <slide class="slide"
              v-for="(m, mindex) in p.media"
              :key="mindex"

              :style="m.type.startsWith('image/') ? {
                backgroundImage: `url(${absSkylink(m.src)})`
              } : {
                backgroundColor: '#2BBBAD'
              }"
            >
              <div class="overlay"
                @click="bigpic($event, m, mindex, p)"
              ></div>

              <div style="position: relative;" :style="{
                zIndex: m.type.startsWith('image/') ? -1 : 0
              }">
                <span class="material-icons" v-if="m.type.startsWith('video/')">videocam</span>
                <span class="material-icons" v-else-if="m.type.startsWith('audio/')">volume_up</span>
                <span class="material-icons" v-else-if="m.type.startsWith('image/')">insert_photo</span>
                <span class="material-icons" v-else>insert_drive_file</span>
                <br>
                {{m.type}}
              </div>
            </slide>
          </carousel>
        </div>
        <div class="card-stacked">
          <div class="card-content notfound" v-if="p.loadStatus == 'notfound'">
            POST NOT FOUND '{{p.id}}'
          </div>
          <div class="card-content" v-else>
            <h5 v-if="!isPostId(p.subject)">{{p.subject}}</h5>
            <pre v-html="postTextFilter(p.text)"></pre>
          </div>
          <div class="card-action">

            <div class="source">

              <a
                data-position="top"
                data-html="true"
                :data-tooltip="getTooltipProfile(p.source)"
                @mousemove="hoverProfile"
                @mouseup.prevent.stop="clickProfile(p.source)"
                class="profile tooltipped"
              >
                <div class="jdenticon-icon" style="width: 24px;height: 24px;">
                  <svg :style="{
                    opacity: p.source ? 1 : 0
                  }" width="100%" height="100%" :data-jdenticon-value="p.source"></svg>
                </div>
                {{ shownProfileName(p.source) }}
              </a>
              {{p.created ? moment(p.created).fromNow() : 'unknown time'}}

              <a
                class="tooltipped updated"
                data-position="top"
                :data-tooltip="moment(p.updated)"
                v-if="p.updated">
                [edited]
              </a>
              <span v-if="p.loadStatus != 'notfound' && p.source == userSkyforaId">
                |
                <a
                @click="editPost(p)"
                >
                  <i class="material-icons">edit</i>
                </a>
                <a @click="removePost(p)">
                  <i class="material-icons">delete_forever</i>
                </a>
              </span>
            </div>

            <a @click="getLink(p)">
              <i class="material-icons">link</i>
            </a>

            <a @click="createPost(p)">
              <i class="material-icons">comment</i> {{p.replies ? p.replies.length : 0}}
            </a>
          </div>
        </div>
      </div>

      <div class="replies">

        <postlist
          ref="replist"
          :reps="true"
          :posts="p.replies"
          :user-skyfora-id="userSkyforaId"
          :zoomed-profile="zoomedProfile"
          :zoomed-post-id="zoomedPostId"
          @edit-post="editPost"
          @remove-post="removePost"
          @create-post="createPost"
          @hover-profile="hoverProfile"
          @profile-click="clickProfile"
        />
      </div>
    </div>
  </div>
</template>

<script>


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

  module.exports = {
    name: 'postlist',
    props: [
      'posts',
      'user-skyfora-id',
      'zoomed-profile',
      'zoomed-post-id',
      'reps'
    ],
    data() {
      return {
        conf: {
          skyPortal: 'https://siasky.net',
          channel: 'skyfora'
        },

        shownReplies: {},

        moment: moment,
        bp: window.bp
      }
    },
    mounted() {

      if (!this.reps) {
        setTimeout(()=>{
          if (!this.reps && this.zoomedPostId) {
            let offtop = document.getElementById(this.zoomedPostId).offsetTop
            window.scrollTo({
              top: offtop - 400,
              behavior: 'smooth'
            })
          }
        }, 1000)
      }
    },
    methods: {
      postTextFilter(text) {
        return skyforaApp.postTextFilter(text)
      },
      clickProfile(skyforaId) {
        this.$emit('profile-click', skyforaId)
        M.Tooltip.init(document.querySelectorAll('.tooltipped'))
      },
      getTooltipProfile(skyforaId) {
        let info = this.profileInfo(skyforaId)
        if (info.data && info.data.profile) {
          let pe = Object.entries(info.data.profile)
          let pdata = ``
          for (var i = 0; i < pe.length; i++) {
            pdata += `<b>${pe[i][0]}</b>: ${pe[i][1].length ? pe[i][1] : '&lt;undefined&gt;'}<br>`
          }

          return `
          <svg width="100" height="100" data-jdenticon-value="${skyforaId}"></svg>
          <div class="user-info">${pdata}</div>
          <div class="skyfora-id">${skyforaId}<br>${info.rel != 'me' ? info.rel : ''}</div>
          `
        }


      },
      shownProfileName(skyforaId) {
        let info = this.profileInfo(skyforaId)
        let fallback = `${skyforaId.substr(0, 7)}`

        if (info.data) {
          return info.data.profile.name && info.data.profile.name.trim().length > 0 ?
            info.data.profile.name :
            fallback
        }
        return fallback
      },

      toggleReplies(p) {
        this.shownReplies[this.getPostId(p)] = !this.shownReplies[this.getPostId(p)]
        this.$nextTick(()=>{
          this.refreshJdenticons()
          this.$forceUpdate()
        })
      },
      isPostId(s) {
        let a = /([ḀḁḂḃḄḅḆḇḈḉḊḋḌḍḎḏḐḑḒḓḔḕḖḗḘḙḚḛḜḝḞḟḠḡḢḣḤḥḦḧḨḩḪḫḬḭḮḯḰḱḲḳḴḵḶḷḸḹḺḻḼḽḾḿṀṁṂṃṄṅṆṇṈṉṊṋṌṍṎṏṐṑṒṓṔṕṖṗṘṙṚṛṜṝṞṟṠṡṢṣṤṥṦṧṨṩṪṫṬṭṮṯṰṱṲṳṴṵṶṷṸṹṺṻṼṽṾṿẀẁẂẃẄẅẆẇẈẉẊẋẌẍẎẏẐẑẒẓẔẕẖẗẘẙẚẛẜẝẞẟẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹỺỻỼỽỾỿ]{32}:[A-Za-z0-9_-]{24})/.test(s)
        return a
      },
      getPostId(p) {
        return `${p.source}:${p.id}`
      },

      editPost(p) {
        this.$emit('edit-post', p)
      },
      removePost(p) {
        this.$emit('remove-post', p)
      },
      createPost(p){
        this.$emit('create-post', p)
      },
      getLink(p) {
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
        let link = `${window.location.origin}/#${this.getPostId(p)}`
        copyStringToClipboard(
          link
        )
        M.toast({html: `Shareable post link copied to clipboard!<br>${link}`})
      },
      profileInfo(skyforaId) {
        return ( skyforaApp.getProfileInfo(skyforaId))
      },
      hoverProfile(p) {
        this.$forceUpdate()
        this.$emit('hover-profile', p)
        this.refreshJdenticons()
      },
      refreshJdenticons() {
        if (typeof window.jdenticon == 'function') {
          window.jdenticon()
        }
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
      rnd(min, max) { //The maximum is exclusive and the minimum is inclusive
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min);
      },
      siaLink(link) {
        return link.replace('sia:', '')
      },
      absSkylink(skylink) {
        skylink = this.siaLink(skylink)
        return `${this.conf.skyPortal}/${skylink}/`
      },
    }
  }
</script>

<style lang="css" scoped>
</style>
