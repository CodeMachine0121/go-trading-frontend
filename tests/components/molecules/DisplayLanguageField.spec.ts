import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DisplayLanguageField from '~/components/molecules/DisplayLanguageField.vue'
import { DisplayLanguageDto } from '~/domain/models/dto/display-language-dto'

const SELECTABLE_LANGUAGES = [
  new DisplayLanguageDto('zh-TW', '繁體中文'),
  new DisplayLanguageDto('en', 'English'),
]

function mountField(selectedCode = 'zh-TW') {
  return mount(DisplayLanguageField, {
    props: { modelValue: selectedCode, selectableLanguages: SELECTABLE_LANGUAGES },
  })
}

describe('DisplayLanguageField', () => {
  it('列出可選的語言，各自用自己的語言寫名字', () => {
    const wrapper = mountField()

    expect(wrapper.findAll('option').map(option => option.text())).toEqual(['繁體中文', 'English'])
  })

  it('目前選的是哪一個看得出來', () => {
    const wrapper = mountField('en')

    expect(wrapper.get<HTMLSelectElement>('[data-testid="display-language-select"]').element.value)
      .toBe('en')
  })

  it('換一個語言時把新的代碼往上送', async () => {
    const wrapper = mountField()

    await wrapper.get('[data-testid="display-language-select"]').setValue('en')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['en'])
  })
})
