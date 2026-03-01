import React from 'react'

export default function WorkDetail() {
    return (
        <div className="max-w-[1000px] mx-auto px-8 py-10 flex flex-col md:flex-row gap-12">
            <div className="flex-1">
                <img
                    src="https://images.unsplash.com/photo-1680350024349-293ae872d5b4?w=800&fit=crop"
                    alt="work"
                    className="w-full h-auto rounded-lg shadow-sm"
                />
            </div>
            <div className="w-full md:w-[320px] flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <img src="https://images.unsplash.com/photo-1680350024349-293ae872d5b4?w=50&h=50&fit=crop" alt="avatar" className="w-10 h-10 rounded-full" />
                    <span className="font-medium">mahdi_chf</span>
                </div>
                <p className="text-[15px] text-muted leading-relaxed mb-8">
                    這件手工真絲洋裝帶著些許週末的慵懶氣息。
                </p>

                <div className="border-t border-gray-200 pt-6 mt-auto">
                    <h4 className="font-medium text-[14px] mb-4">留言 (2)</h4>
                    <div className="flex flex-col gap-4">
                        <div className="text-[13px]">
                            <span className="font-medium mr-2">alisa_style</span>
                            <span className="text-muted">請問這件有其他尺寸嗎？</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
