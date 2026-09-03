<script setup lang="ts">
// 原子：全站唯一的圖示元件。
//
// 圖示直接畫在這裡而不是拉一套圖示庫：整個介面用得到的不到十個，
// 為此多一個相依、多一份要跟著升級的東西並不划算。
// 需要新的圖示時，是在下面這張表多一列，不是新增一個元件。
//
// 每個圖示都是 24×24 的線條稿，`currentColor` 讓它跟著按鈕的文字色走，
// 因此同一個圖示放在哪一種按鈕上都不必另外調色。

type IconName
  = | 'new'
    | 'save'
    | 'save-as'
    | 'library'
    | 'rename'
    | 'load'
    | 'delete'
    | 'close'
    | 'example'
    | 'connection'
    | 'table'
    | 'candles'
    | 'formula'
    | 'refresh'

/** 每個圖示由幾條路徑組成。全站的圖示只在這裡定義。 */
const ICON_PATHS: Readonly<Record<IconName, string[]>> = {
  // 一張空白的紙加一個加號——開一份新的
  'new': [
    'M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z',
    'M13 3v6h6',
    'M12 13v5M9.5 15.5h5',
  ],
  // 磁片
  'save': [
    'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z',
    'M17 21v-8H7v8',
    'M7 3v5h8',
  ],
  // 兩張疊在一起的紙——複製出一份新的
  'save-as': [
    'M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2Z',
    'M5 15H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1',
  ],
  // 清單
  'library': [
    'M8 6h13M8 12h13M8 18h13',
    'M3 6h.01M3 12h.01M3 18h.01',
  ],
  // 鉛筆
  'rename': [
    'M12 20h9',
    'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  ],
  // 往下的箭頭——把它取進來
  'load': [
    'M12 3v12',
    'm7 10 5 5 5-5',
    'M21 21H3',
  ],
  // 垃圾桶
  'delete': [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'M10 11v6M14 11v6',
  ],
  // 叉
  'close': [
    'M18 6 6 18M6 6l12 12',
  ],
  // 星芒——帶入一段現成的東西
  'example': [
    'm12 3-1.9 5.8L4 10.7l6.1 1.9L12 18.5l1.9-5.9L20 10.7l-6.1-1.9Z',
  ],
  // 一段心跳——後端還活著嗎
  'connection': [
    'M3 12h4l2.5-7 4.5 14 2.5-7h4',
  ],
  // 一張有欄有列的表
  'table': [
    'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
    'M3 9h18M3 15h18M11 9v11',
  ],
  // 兩根帶影線的蠟燭
  'candles': [
    'M7 3v3M7 15v3',
    'M5 6h4v9H5z',
    'M17 5v3M17 18v2',
    'M15 8h4v10h-4z',
  ],
  // 一對大括號夾著一個算式
  'formula': [
    'M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1',
    'M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1',
    'm10 9 4 6M14 9l-4 6',
  ],
  // 繞一圈的箭頭——再問一次
  'refresh': [
    'M20.5 12a8.5 8.5 0 1 1-2.8-6.3',
    'M21 4v5h-5',
  ],
}

const { name, size = 'medium' } = defineProps<{
  name: IconName
  size?: 'small' | 'medium'
}>()

const paths = computed(() => ICON_PATHS[name])
</script>

<template>
  <svg
    class="app-icon"
    :class="`app-icon--${size}`"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    :data-icon="name"
  >
    <path
      v-for="path in paths"
      :key="path"
      :d="path"
    />
  </svg>
</template>

<style scoped lang="scss">
.app-icon {
  flex: none;

  &--small {
    width: font-size('md');
    height: font-size('md');
  }

  &--medium {
    width: font-size('lg');
    height: font-size('lg');
  }
}
</style>
