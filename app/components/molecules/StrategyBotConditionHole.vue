<script setup lang="ts">
// 分子：一個還沒放東西的位置。
//
// 它**被畫出來**而不是留成空白，因為空白跟「這裡本來就不需要東西」長得一樣。
// 一棵還沒開始拼的樹，畫面上就是一個這個——看得出少一塊，也看得出該往哪裡放。
//
// 它同時是點按與拖拉的落點。兩條路都要有：巢狀第三層的洞很小，
// 而點按是任何情況下都按得到的那一條。
const { selected, acceptsDragged, dragActive } = defineProps<{
  /** 使用者剛剛點的就是這一個。抽屜這時列的是放得進這裡的東西。 */
  selected: boolean
  /** 現在拖著的那個東西放不放得進來。沒有人在拖時恆為 false。 */
  acceptsDragged: boolean
  /** 畫面上正有東西被拖著。收不收得下這一件事，只在有人在拖的時候才需要說。 */
  dragActive: boolean
}>()

const emit = defineEmits<{ select: [], drop: [] }>()

/**
 * 這個洞現在長成哪一種樣子。
 *
 * 三種互斥的狀態寫成一個字串而不是三個布林：同時「被選著」又「拒收」是無意義的，
 * 而三個布林的型別允許它發生。
 */
const tone = computed(() => {
  if (dragActive) {
    return acceptsDragged ? 'accepting' : 'refusing'
  }

  return selected ? 'selected' : 'idle'
})

const hint = computed(() => {
  if (tone.value === 'refusing') {
    return '這一塊放不進這裡'
  }

  return tone.value === 'selected' ? '從下面的抽屜挑一塊' : '放一塊進來'
})
</script>

<template>
  <button
    type="button"
    class="condition-hole"
    :class="`condition-hole--${tone}`"
    :aria-pressed="selected"
    data-testid="condition-hole"
    @click="emit('select')"
    @dragover.prevent="undefined"
    @drop.prevent="acceptsDragged ? emit('drop') : undefined"
  >
    <span
      class="condition-hole__mark"
      aria-hidden="true"
    >＋</span>
    <span class="condition-hole__hint">{{ hint }}</span>
  </button>
</template>

<style scoped lang="scss">
.condition-hole {
  display: flex;
  align-items: center;
  gap: spacing('2xs');

  // 虛線是「這裡還沒有東西」最短的說法——實線框看起來像一個已經存在的欄位。
  border: 1px dashed color('border');
  border-radius: radius('sm');
  background-color: transparent;
  cursor: pointer;
  padding: spacing('2xs') spacing('xs');
  width: 100%;
  color: color('text-muted');
  font-size: font-size('xs');
  font-family: inherit;
  text-align: left;

  &__mark {
    flex: none;
    font-size: font-size('sm');
    line-height: 1;
  }

  &:hover {
    border-color: color('primary');
    color: color('text');
  }

  &--selected {
    border-style: solid;
    border-color: color('primary');
    background-color: color('primary-soft');
    color: color('text-strong');
  }

  // 拖到上面時整個框實起來：虛線在拖曳中看起來像還沒決定，而它已經決定了。
  &--accepting {
    border-style: solid;
    border-color: color('success');
    background-color: color('success-soft');
    color: color('success');
  }

  &--refusing {
    border-color: color('danger');
    color: color('danger');

    // 拒收的地方不該看起來可以放，所以連游標都說不行。
    cursor: not-allowed;
  }
}
</style>
