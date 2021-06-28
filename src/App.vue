<template>
    <h1>hello</h1>
    <h2>
        <span>count is {{count}} * 2 = {{double}}</span>
        <button @click="count++"></button>
    </h2>
    <img src="../logo.png" alt="">
</template>

<script>
import { ref, computed } from 'vue'

export default {
    setup() {
        const count = ref(6)
        const add = () => {
            count ++
        }
        const double = computed(() => count.value * 2)
        return {
            count,
            add,
            double
        }
    },
}
</script>
