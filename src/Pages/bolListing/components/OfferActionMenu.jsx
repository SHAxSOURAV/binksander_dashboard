import React, { useState } from 'react';
import { Dropdown, Menu, Modal, InputNumber, message } from 'antd';
import { FiMoreVertical, FiEdit2, FiPauseCircle, FiPlayCircle, FiTrash2 } from 'react-icons/fi';
import { 
  useUpdateBolOfferStatusMutation, 
  useUpdateBolOfferStockMutation, 
  useDeleteBolOfferMutation 
} from '../../../Redux/productApis';

const OfferActionMenu = ({ offer }) => {
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [newStock, setNewStock] = useState(offer.stock?.amount || 0);

  const [updateStatus, { isLoading: isStatusLoading }] = useUpdateBolOfferStatusMutation();
  const [updateStock, { isLoading: isStockLoading }] = useUpdateBolOfferStockMutation();
  const [deleteOffer, { isLoading: isDeleteLoading }] = useDeleteBolOfferMutation();

  const handleStatusToggle = async () => {
    try {
      await updateStatus({ 
        offerId: offer.offerId, 
        onHoldByRetailer: !offer.onHoldByRetailer 
      }).unwrap();
      message.success(`Offer ${offer.onHoldByRetailer ? 'resumed' : 'paused'} successfully`);
    } catch (err) {
      message.error(err?.data?.detail || "Failed to update offer status");
    }
  };

  const handleStockUpdate = async () => {
    try {
      await updateStock({ 
        offerId: offer.offerId, 
        amount: newStock 
      }).unwrap();
      message.success("Stock updated successfully");
      setIsStockModalOpen(false);
    } catch (err) {
      message.error(err?.data?.detail || "Failed to update stock");
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Offer',
      content: 'Are you sure you want to delete this offer from Bol.com? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteOffer(offer.offerId).unwrap();
          message.success("Offer deleted successfully");
        } catch (err) {
          message.error(err?.data?.detail || "Failed to delete offer");
        }
      }
    });
  };

  const menu = (
    <Menu onClick={(e) => e.domEvent.stopPropagation()}>
      <Menu.Item 
        key="stock" 
        icon={<FiEdit2 />} 
        onClick={(e) => { e.domEvent.stopPropagation(); setIsStockModalOpen(true); }}
      >
        Update Stock
      </Menu.Item>
      <Menu.Item 
        key="status" 
        icon={offer.onHoldByRetailer ? <FiPlayCircle /> : <FiPauseCircle />} 
        onClick={(e) => { e.domEvent.stopPropagation(); handleStatusToggle(); }}
      >
        {offer.onHoldByRetailer ? "Resume Listing" : "Pause Listing"}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="delete" 
        danger 
        icon={<FiTrash2 />} 
        onClick={(e) => { e.domEvent.stopPropagation(); handleDelete(); }}
      >
        Delete Offer
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} trigger={['click']}>
        <button 
          onClick={(e) => e.stopPropagation()} 
          className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-500 hover:text-brand hover:border-brand shadow-sm transition-colors"
          disabled={isStatusLoading || isDeleteLoading}
        >
          <FiMoreVertical size={14} />
        </button>
      </Dropdown>

      <Modal
        title="Update Stock"
        open={isStockModalOpen}
        onOk={(e) => { e.stopPropagation(); handleStockUpdate(); }}
        onCancel={(e) => { e.stopPropagation(); setIsStockModalOpen(false); }}
        confirmLoading={isStockLoading}
        okText="Update"
      >
        <div className="py-4" onClick={(e) => e.stopPropagation()}>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Stock Amount</label>
          <InputNumber 
            min={0} 
            value={newStock} 
            onChange={setNewStock} 
            className="w-full"
          />
        </div>
      </Modal>
    </>
  );
};

export default OfferActionMenu;
