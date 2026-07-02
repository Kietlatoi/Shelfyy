import React, { useState } from 'react';
import { MaterialIcon } from './MaterialIcon';
import { LoadingButton } from './LoadingButton';

export function WardrobeUploadModal({ onClose, onUploadSuccess }) {
  const [imagePreview, setImagePreview] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Form fields state
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Áo',
    color: 'Trắng',
    colorHex: '#ffffff',
    season: 'Bốn mùa',
    pattern: 'Trơn',
    size: 'M',
    material: 'Cotton'
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Auto-fill simulation with nice defaults when image is uploaded
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        setFormData(prev => ({
          ...prev,
          name: file.name.split('.')[0] || 'Trang phục mới',
          brand: 'ZARA',
          category: 'Áo thun',
          color: 'Trắng tinh khôi',
          colorHex: '#ffffff',
          season: 'Xuân - Hè',
          pattern: 'Trơn',
          size: 'M',
          material: 'Cotton 100%'
        }));
      }, 1000);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!imagePreview) {
      alert('Vui lòng tải ảnh lên trước!');
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      onUploadSuccess({
        name: formData.name || 'Trang phục chưa đặt tên',
        brand: formData.brand || 'Khác',
        category: formData.category,
        color: formData.color,
        colorHex: formData.colorHex,
        season: formData.season,
        pattern: formData.pattern,
        url: imagePreview,
        meta: `Size: ${formData.size} | ${formData.material}`
      });
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Thêm trang phục & Tải ảnh lên</h2>
            <p className="text-xs text-gray-500">Tải ảnh lên và điều chỉnh các thông số trang phục của bạn.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-2">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Image Upload */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">Hình ảnh trang phục</label>
              
              <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-rose-500 transition-colors bg-gray-50/50 flex flex-col justify-center items-center aspect-square max-w-[280px] mx-auto w-full">
                {imagePreview ? (
                  <div className="relative w-full h-full rounded-xl overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setImagePreview('')}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow hover:bg-red-600 transition-colors"
                      type="button"
                    >
                      <MaterialIcon name="delete" className="text-sm" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block space-y-3 py-6 w-full">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                      <MaterialIcon name="cloud_upload" className="text-[28px]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-800">Nhấp để chọn ảnh</p>
                      <p className="text-xs text-gray-400">PNG, JPG hoặc JPEG</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                )}
              </div>
              {isAnalyzing && (
                <p className="text-xs text-rose-500 font-semibold text-center animate-pulse">
                  🤖 AI đang quét ảnh để gợi ý thông số...
                </p>
              )}
            </div>

            {/* Right Column: Form Inputs */}
            <div className="space-y-4">
              {/* Tên trang phục */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tên trang phục</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="VD: Áo Thun Basic Zara"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-rose-500/20"
                  required
                />
              </div>

              {/* Thương hiệu */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Thương hiệu</label>
                <input 
                  type="text" 
                  name="brand" 
                  value={formData.brand} 
                  onChange={handleInputChange} 
                  placeholder="VD: ZARA, H&M, Levi's..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phân loại */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phân loại</label>
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-rose-500/20"
                  >
                    <option value="Áo thun">Áo thun</option>
                    <option value="Áo sơ mi">Áo sơ mi</option>
                    <option value="Áo khoác Blazer">Áo khoác Blazer</option>
                    <option value="Áo Hoodie">Áo Hoodie</option>
                    <option value="Quần Jeans">Quần Jeans</option>
                    <option value="Quần tây">Quần tây</option>
                    <option value="Váy liền thân">Váy liền thân</option>
                    <option value="Phụ kiện">Phụ kiện</option>
                  </select>
                </div>

                {/* Họa tiết */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Họa tiết</label>
                  <input 
                    type="text" 
                    name="pattern" 
                    value={formData.pattern} 
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Màu sắc */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tên Màu sắc</label>
                  <input 
                    type="text" 
                    name="color" 
                    value={formData.color} 
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-rose-500 focus:ring-rose-500/20"
                  />
                </div>

                {/* Chọn mã màu */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mã màu hiển thị</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      name="colorHex" 
                      value={formData.colorHex} 
                      onChange={handleInputChange}
                      className="w-10 h-10 rounded border border-gray-200 p-0 cursor-pointer"
                    />
                    <input 
                      type="text" 
                      name="colorHex" 
                      value={formData.colorHex} 
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center font-mono focus:border-rose-500 focus:ring-rose-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Mùa */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mùa</label>
                  <select 
                    name="season" 
                    value={formData.season} 
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-gray-200 px-2 py-2.5 text-xs focus:border-rose-500 focus:ring-rose-500/20"
                  >
                    <option value="Xuân - Hè">Xuân - Hè</option>
                    <option value="Thu - Đông">Thu - Đông</option>
                    <option value="Bốn mùa">Bốn mùa</option>
                  </select>
                </div>

                {/* Size */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Kích cỡ</label>
                  <input 
                    type="text" 
                    name="size" 
                    value={formData.size} 
                    onChange={handleInputChange}
                    placeholder="VD: M, L, XL"
                    className="w-full rounded-xl border border-gray-200 px-2 py-2.5 text-xs text-center focus:border-rose-500 focus:ring-rose-500/20"
                  />
                </div>

                {/* Chất liệu */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Chất liệu</label>
                  <input 
                    type="text" 
                    name="material" 
                    value={formData.material} 
                    onChange={handleInputChange}
                    placeholder="VD: Cotton"
                    className="w-full rounded-xl border border-gray-200 px-2 py-2.5 text-xs text-center focus:border-rose-500 focus:ring-rose-500/20"
                  />
                </div>
              </div>

            </div>

          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-100 pt-6 flex justify-end gap-3">
            <button 
              onClick={onClose} 
              type="button"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy bỏ
            </button>
            
            <LoadingButton
              isLoading={isAnalyzing}
              type="submit"
              disabled={!imagePreview || isAnalyzing}
              className="px-6 py-2.5 rounded-xl bg-[#b83c44] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-rose-900/10"
            >
              {isAnalyzing ? 'Đang lưu tủ đồ...' : 'Lưu trang phục'}
            </LoadingButton>
          </div>

        </form>
      </div>
    </div>
  );
}
